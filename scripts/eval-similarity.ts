// Calibration run for SIMILARITY_THRESHOLD (ticket 25). Scores the synthetic queries
// in evals/ against the real index, through the same search the app uses, and
// reports what each candidate threshold would let through. Run from the repository
// root with `pnpm eval:similarity`; it needs Ollama running with the embedding model.

import { EVAL_QUERIES } from "../evals/similarity-queries.ts";
import { embedModelName, searchKnowledge } from "../src/lib/rag.ts";

// 0.30 to 0.70 in steps of 0.05.
const THRESHOLDS = Array.from({ length: 9 }, (_, step) => (30 + step * 5) / 100);

async function main(): Promise<void> {
  const results = [];
  for (const entry of EVAL_QUERIES) {
    results.push({ ...entry, fragments: await searchKnowledge(entry.query) });
  }
  if (results.every((result) => result.fragments.length === 0)) {
    throw new Error("knowledge/ is missing or has no .md/.txt files: there is nothing to evaluate.");
  }

  const topK = Math.max(...results.map((result) => result.fragments.length));
  console.log(`Embedding model: ${embedModelName()}`);
  console.log(`Queries: ${results.length} · fragments per query: ${topK}\n`);

  for (const result of results) {
    console.log(`${result.id} [${result.kind}] «${result.query}»`);
    console.log(`  expected: ${result.expected ?? "nothing"}`);
    for (const fragment of result.fragments) {
      const mark = fragment.fileName === result.expected ? "  <- expected" : "";
      console.log(`  ${fragment.score.toFixed(3)}  ${fragment.fileName}${mark}`);
    }
  }

  const topicResults = results.filter((result) => result.kind === "topic");
  const hits = topicResults.filter((result) => result.fragments.some((fragment) => fragment.fileName === result.expected));
  console.log(`\nTop-${topK} hit rate (topic queries): ${hits.length}/${topicResults.length}`);

  // A fragment is expected when it comes from the document the query should retrieve;
  // every other fragment is irrelevant, and for off-topic and short-reply queries that
  // is all of them.
  const scoredFragments = results.flatMap((result) =>
    result.fragments.map((fragment) => ({
      kind: result.kind,
      queryId: result.id,
      fileName: fragment.fileName,
      score: fragment.score,
      expected: fragment.fileName === result.expected,
    })),
  );
  const expectedFragments = scoredFragments.filter((fragment) => fragment.expected);
  const irrelevantIn = (kind: string) => scoredFragments.filter((fragment) => !fragment.expected && fragment.kind === kind);
  const passing = (fragments: { score: number }[], threshold: number) =>
    fragments.filter((fragment) => fragment.score >= threshold).length;

  const groups = [
    { label: "expected", fragments: expectedFragments },
    { label: "irrelevant (topic)", fragments: irrelevantIn("topic") },
    { label: "irrelevant (off-topic)", fragments: irrelevantIn("off-topic") },
    { label: "irrelevant (short-reply)", fragments: irrelevantIn("short-reply") },
  ];

  console.log("\nFragments that pass each threshold (passing/total returned)");
  console.log(["threshold", ...groups.map((group) => `${group.label} (${group.fragments.length})`)].join(" | "));
  for (const threshold of THRESHOLDS) {
    const cells = groups.map((group) => `${passing(group.fragments, threshold)}`.padStart(`${group.label} (${group.fragments.length})`.length));
    console.log([threshold.toFixed(2).padEnd("threshold".length), ...cells].join(" | "));
  }

  const irrelevant = scoredFragments.filter((fragment) => !fragment.expected);
  const highestIrrelevant = irrelevant.reduce((best, fragment) => (fragment.score > best.score ? fragment : best));
  const lowestExpected = expectedFragments.reduce((worst, fragment) => (fragment.score < worst.score ? fragment : worst));
  console.log(`\nHighest irrelevant score: ${highestIrrelevant.score.toFixed(3)} (${highestIrrelevant.queryId} -> ${highestIrrelevant.fileName})`);
  console.log(`Lowest expected score:    ${lowestExpected.score.toFixed(3)} (${lowestExpected.queryId} -> ${lowestExpected.fileName})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
