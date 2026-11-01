# Índice de decisiones de arquitectura

[Índice general](../README.md)

## Índice

- [Cómo leer los ADR](#cómo-leer-los-adr)
- [Decisiones](#decisiones)
- [Evolución principal](#evolución-principal)

## Cómo leer los ADR

Un ADR registra una decisión y sus motivos en un momento del proyecto. Los textos originales se conservan; esta tabla orienta sobre su relación con el código actual. Para aprender el funcionamiento vigente, comenzar por las [guías](../README.md#guías-del-funcionamiento-actual).

## Decisiones

| ADR | Tema | Relación con el estado actual |
| --- | --- | --- |
| [0001](0001-frontend-static-mockup-port.md) | Port del mockup | Antecedente visual; la interfaz ahora tiene lógica y persistencia |
| [0002](0002-backend-gemini-via-llamaindex.md) | Gemini mediante LlamaIndex | Integración histórica, cambiada por 0004 y luego 0008 |
| [0003](0003-recommendation-json-contract.md) | Contrato JSON en la respuesta | Base del contrato; consultar el parser y validador actual en la guía de Ollama |
| [0004](0004-direct-gemini-via-google-genai.md) | Gemini directo | Reemplazado por 0008; esas dependencias no están en el proyecto actual |
| [0005](0005-panel-reconciliation-and-human-precedence.md) | Reconciliación y prioridad humana | Base del panel, extendida por 0011 |
| [0006](0006-case-lifecycle-and-discard-case.md) | Ciclo de vida y descarte | Numeración y conservación en base modificadas por 0010 |
| [0007](0007-initial-triage-prompt.md) | Entrevista inicial | Prompt vigente; las menciones a reintento no describen un botón actual |
| [0008](0008-local-ollama-via-llamaindex.md) | Ollama local | Proveedor actual de chat; reemplaza Gemini |
| [0009](0009-rag-over-manchester-protocol.md) | Recuperación por turno | Base del RAG; el modelo de embeddings cambió en 0012; corpus y limitaciones actuales se detallan en la guía |
| [0010](0010-cases-persisted-in-local-sqlite.md) | Casos y mensajes en SQLite | Persistencia actual; el nombre del paciente se agrega en 0011 |
| [0011](0011-clinician-edits-in-the-panel.md) | Edición manual del panel | Nombre, signos y selección provisional de nivel |
| [0012](0012-embeddinggemma-as-default-embedding-model.md) | Modelo de embeddings por defecto | `embeddinggemma` reemplaza a `bge-m3` nombrado en 0009 |
| [0013](0013-similarity-threshold-measured-on-embeddinggemma.md) | Umbral de similitud medido | El umbral es 0,30, medido con `embeddinggemma`; reemplaza al valor provisional de 0009 y 0012 |

## Evolución principal

El proveedor pasó de Gemini mediante LlamaIndex a Gemini directo y finalmente a Ollama mediante LlamaIndex. El contrato de respuesta se conservó como conexión entre modelo y panel. El modelo de embeddings por defecto pasó de `bge-m3` a `embeddinggemma`.

El ciclo de vida pasó de estado local y contador en memoria a números asignados por SQLite. Descartar sigue limpiando la sesión visible, pero ahora marca el registro en lugar de eliminarlo. La edición manual amplió la prioridad del profesional a nombre, signos y selección del nivel.

Las diferencias entre intención histórica y código, incluido Reintentar, están descritas en [flujo de un caso](../guia/04-flujo-de-un-caso.md) y [desarrollo](../guia/08-desarrollo-y-diagnostico.md).
