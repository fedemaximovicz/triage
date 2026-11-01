# TriageAI

Prototipo de asistencia al triage: el profesional conversa con un modelo local, recibe una sugerencia de nivel Manchester y conserva el control de la decisión. Combina una interfaz web, recuperación de documentos (RAG), inferencia mediante Ollama y persistencia local de casos.

## Índice

- [Qué incluye](#qué-incluye)
- [Tecnologías](#tecnologías)
- [Inicio rápido](#inicio-rápido)
- [Documentación](#documentación)
- [Alcance actual](#alcance-actual)

## Qué incluye

La pantalla principal reúne navegación, conversación y panel de recomendación. Permite iniciar un caso, intercambiar mensajes, editar nombre y signos vitales, aceptar o cambiar el nivel sugerido, agregar una nota y descartar el caso. La pantalla de casos abiertos lista los registros guardados que no están descartados.

En cada mensaje del profesional, el servidor busca fragmentos de `knowledge/` y los entrega a Ollama como referencia para ese turno. El texto de la respuesta va al chat; su bloque JSON alimenta el panel.

## Tecnologías

| Componente | Implementación del repositorio |
| --- | --- |
| Aplicación web | Next.js 16.2.10, React 19.2.4, TypeScript y Tailwind CSS 4 |
| Comunicación con el servidor | Server Actions de Next.js |
| Modelo y recuperación | LlamaIndex.TS 0.12.1 y `@llamaindex/ollama` 0.1.23 |
| Inferencia local | Ollama; chat `llama3.2:3b` y embeddings `embeddinggemma` por defecto |
| Casos y mensajes | SQLite mediante `node:sqlite` |
| Índice vectorial | Almacenamiento local de LlamaIndex en `.rag-index/` |

Versiones declaradas en [package.json](package.json). El entorno de referencia utiliza Node.js 24 y pnpm 11.

## Inicio rápido

Con Node.js 24, pnpm 11 y Ollama instalados, ejecutar desde la raíz:

```sh
pnpm install --frozen-lockfile
ollama pull llama3.2:3b
ollama pull embeddinggemma
```

Mantener Ollama iniciado; si no está en ejecución, iniciarlo en otra terminal con `ollama serve`. Luego:

```sh
pnpm dev
```

Abrir [la aplicación local](http://localhost:3000). La configuración predeterminada utiliza `http://127.0.0.1:11434`. Para cambiarla, copiar [.env.example](.env.example) a `.env.local` antes de iniciar Next.js.

Ver [instalación y configuración](docs/guia/02-instalacion-y-configuracion.md) para requisitos, variables y comprobaciones iniciales.

## Documentación

El [índice general](docs/README.md) organiza las guías y los antecedentes.

- **Para entenderlo:** [visión general](docs/guia/01-vision-general.md), [arquitectura](docs/guia/03-arquitectura-y-componentes.md) y [flujo de un caso](docs/guia/04-flujo-de-un-caso.md).
- **Para entender la IA:** [integración con Ollama](docs/guia/05-integracion-ollama.md) y [RAG](docs/guia/06-rag.md).
- **Para trabajar en el código:** [persistencia y estado](docs/guia/07-persistencia-y-estado.md) y [desarrollo y diagnóstico](docs/guia/08-desarrollo-y-diagnostico.md).

## Alcance actual

La memoria del chat es compartida dentro del proceso del servidor; no hay aislamiento por usuario o caso concurrente. Los casos se guardan, pero no pueden reabrirse para continuar una entrevista. Algunos controles, como adjuntar archivos y Documentos, son visuales.

La base de conocimiento contiene borradores no validados y un archivo de prueba. El código no filtra documentos por aprobación ni implementa un motor determinista de reglas Manchester. Esta documentación describe el prototipo y sus límites; no acredita validación clínica. Ver [límites del RAG](docs/guia/06-rag.md#límites-y-diferencias-con-las-propuestas).
