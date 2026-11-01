# Índice de tickets

[Índice general](../README.md)

## Índice

- [Cómo usar este registro](#cómo-usar-este-registro)
- [Interfaz y primeras respuestas](#interfaz-y-primeras-respuestas)
- [Ciclo de vida del caso](#ciclo-de-vida-del-caso)
- [Ollama RAG y persistencia](#ollama-rag-y-persistencia)

## Cómo usar este registro

Los tickets conservan tareas y criterios históricos. Su presencia no certifica cumplimiento actual. En particular, Gemini fue reemplazado, el botón Reintentar del ticket 13 no aparece en el chat actual y descartar conserva los registros desde la incorporación de SQLite.

Para el comportamiento vigente, ver [flujo de un caso](../guia/04-flujo-de-un-caso.md). Para decisiones y reemplazos, ver [ADR](../adr/README.md).

## Interfaz y primeras respuestas

| Ticket | Tema |
| --- | --- |
| [01](01-three-column-layout-and-nav.md) | Diseño de tres columnas y navegación |
| [02](02-chat-thread-and-composer.md) | Conversación y compositor |
| [03](03-send-message-and-canned-reply.md) | Envío y respuesta fija de prueba |
| [04](04-recommendation-panel-placeholders.md) | Placeholders del panel |
| [05](05-panel-actions-anular-aceptar-nota.md) | Anular, aceptar y nota |
| [06](06-backend-gemini-chat-action.md) | Acción de servidor para Gemini; histórica |
| [07](07-chat-calls-the-model.md) | Conectar chat con modelo |
| [08](08-panel-driven-by-the-model.md) | Contrato de recomendación del modelo |
| [09](09-panel-renders-the-recommendation.md) | Renderizar recomendación |

## Ciclo de vida del caso

| Ticket | Tema |
| --- | --- |
| [10](10-case-does-not-exist-until-started.md) | Pantalla sin caso hasta iniciar |
| [11](11-ai-opens-the-case-by-interviewing.md) | Apertura de entrevista por IA |
| [12](12-panel-keeps-what-the-ai-already-knew.md) | Continuidad de información del panel; consultar reglas actuales |
| [13](13-failed-opening-turn-can-be-retried.md) | Reintento de apertura; botón ausente en la interfaz actual |
| [14](14-descartar-caso-throws-the-case-away.md) | Descartar y abrir otro caso; SQLite conserva el anterior |
| [15](15-deshacer-releases-the-decision.md) | Deshacer decisión humana |

## Ollama RAG y persistencia

| Ticket | Tema |
| --- | --- |
| [16](16-chat-answered-by-local-ollama.md) | Sustituir Gemini por Ollama |
| [17](17-clinician-turns-get-retrieved-context.md) | Recuperar contexto para mensajes del profesional |
| [18](18-index-persists-on-disk.md) | Persistir y reutilizar índice |
| [19](19-iniciar-caso-warms-the-index.md) | Preparar índice al iniciar caso |
| [20](20-no-user-in-the-ui.md) | Retirar identidad de usuario de la interfaz |
| [21](21-cases-are-saved.md) | Guardar casos y conversación |
| [22](22-decision-and-note-are-saved.md) | Guardar decisión y nota |
| [23](23-casos-abiertos-lists-saved-cases.md) | Lista de casos guardados |
| [24](24-clinician-edits-the-panel.md) | Edición de nombre, signos y nivel |
| [25](25-similarity-threshold-is-calibrated.md) | Medir y calibrar el umbral de similitud; abierto |
