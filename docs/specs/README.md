# Índice de especificaciones

[Índice general](../README.md)

## Índice

- [Especificaciones disponibles](#especificaciones-disponibles)
- [Uso y vigencia](#uso-y-vigencia)

## Especificaciones disponibles

| Documento | Alcance | Guía actual relacionada |
| --- | --- | --- |
| [Frontend: Nuevo caso](frontend-nuevo-caso.md) | Diseño inicial de navegación, conversación y panel | [Arquitectura](../guia/03-arquitectura-y-componentes.md) |
| [Inicio y descarte de caso](inicio-y-descarte-de-caso.md) | Estados y comportamiento del ciclo de vida | [Flujo de un caso](../guia/04-flujo-de-un-caso.md) |
| [Ollama local y RAG](ollama-local-y-rag.md) | Modelos locales, recuperación e índice | [Ollama](../guia/05-integracion-ollama.md) y [RAG](../guia/06-rag.md) |

## Uso y vigencia

Las especificaciones conservan el diseño acordado para una etapa. Las decisiones posteriores y el código pueden modificarlo. Por ejemplo, el estado y la numeración de casos evolucionaron hacia SQLite; la interfaz actual no ofrece Reintentar aunque figure en antecedentes.

Para conocer lo implementado, usar las guías enlazadas. Para comprender por qué cambió, consultar el [índice de ADR](../adr/README.md). Los [tickets](../tickets/README.md) descomponen el trabajo histórico y sus criterios de aceptación.
