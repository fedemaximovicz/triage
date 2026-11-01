# 01. Visión general

[Índice general](../README.md) · [Siguiente: instalación](02-instalacion-y-configuracion.md)

## Índice

- [Propósito](#propósito)
- [Experiencia de uso](#experiencia-de-uso)
- [Conceptos esenciales](#conceptos-esenciales)
- [Funciones y alcance](#funciones-y-alcance)
- [Lecturas relacionadas](#lecturas-relacionadas)

## Propósito

TriageAI es un prototipo de asistencia al profesional que realiza triage. Recibe información mediante una conversación y campos editables, produce una respuesta en español y sugiere un nivel de prioridad. El profesional puede confirmar o modificar ese nivel.

La aplicación usa las claves `rojo`, `naranja`, `amarillo`, `verde` y `azul`, definidas en [manchester.ts](../../src/lib/manchester.ts). Esas claves organizan el panel y la lista de casos. Su presencia en el código no constituye una implementación completa y validada del protocolo Manchester.

El proyecto usa modelos ya disponibles en Ollama. No contiene un proceso de entrenamiento o ajuste fino: aporta instrucciones y documentos al modelo durante la inferencia.

## Experiencia de uso

La ruta `/` presenta tres columnas: navegación, chat y panel. Al abrirla no hay un caso activo. **Iniciar caso** crea un registro y solicita al modelo que abra la entrevista con una pregunta. Después, cada mensaje del profesional puede producir una nueva respuesta y una actualización del panel.

El panel muestra motivo, antecedentes, signos vitales, nivel, confianza declarada por el modelo, razonamiento, información faltante y próximos pasos. El nombre y los signos vitales se pueden editar manualmente. El profesional decide mediante **Aceptar** o **Anular** y puede agregar una nota.

La ruta `/casos` muestra casos guardados no descartados. Es una consulta de solo lectura, sin apertura del historial ni continuación de entrevistas.

## Conceptos esenciales

| Término | Significado en este proyecto |
| --- | --- |
| Caso | Registro con número, inicio, estado y datos guardados de una entrevista |
| Turno | Mensaje enviado al modelo y respuesta asociada; la apertura usa un mensaje fijo invisible |
| LLM | Modelo de lenguaje que genera texto; por defecto `llama3.2:3b` |
| Ollama | Servicio que ejecuta localmente los modelos usados por el servidor |
| LlamaIndex | Biblioteca usada para acceder a Ollama, manejar memoria y construir/consultar el índice |
| RAG | Recuperación de documentos para aportar contexto a una respuesta generada |
| Embedding | Vector numérico que representa texto para buscar similitudes; por defecto se genera con `embeddinggemma` |
| Fragmento o chunk | Porción de un documento que se indexa y puede recuperarse |
| Índice vectorial | Estructura que relaciona fragmentos con sus vectores de búsqueda |
| Contexto recuperado | Fragmentos seleccionados para el mensaje actual; no se agregan directamente al historial |
| Recomendación | Objeto JSON extraído de la respuesta del modelo y validado campo por campo |
| Decisión humana | Nivel confirmado o anulado por el profesional, que prevalece en la interfaz |
| Server Action | Función del servidor que Next.js permite invocar desde la interfaz |

La similitud de un fragmento, la confianza declarada por el modelo y la decisión humana son datos diferentes. La aplicación no demuestra calibración clínica de los dos primeros.

## Funciones y alcance

| Disponible en el código | Límite relevante |
| --- | --- |
| Conversación local con Ollama | Sin streaming ni aislamiento de memoria por caso concurrente |
| Recuperación de Markdown y texto | Solo archivos directamente dentro de `knowledge/`; sin PDF ni filtros por aprobación |
| Actualización del panel a partir de JSON | El formato depende de la respuesta del modelo; puede faltar o ser inválido |
| Nombre y signos vitales editables | Los signos manuales no se guardan como datos estructurados en SQLite |
| Decisiones y notas guardadas | Los errores de estos guardados se registran en consola, sin revertir la interfaz |
| Lista de casos abiertos | No permite retomar un caso ni consultar mensajes guardados |
| Descarte de casos | Cambia el estado en SQLite; conserva el registro y sus mensajes |
| Controles de adjuntos y Documentos | Son elementos visuales sin carga de archivos ni ruta funcional |

No hay autenticación, registro de autor de cada decisión, motor determinista de clasificación ni evaluación clínica automatizada en el repositorio. Los objetivos de [requerimientos](../requerimientos.md) deben leerse como objetivos, no como inventario de funciones terminadas.

## Lecturas relacionadas

- [Arquitectura](03-arquitectura-y-componentes.md): componentes y límites entre cliente y servidor.
- [Flujo de un caso](04-flujo-de-un-caso.md): comportamiento de cada acción.
- [RAG](06-rag.md): alcance del corpus y limitaciones de recuperación.
- [Glosario original](../../CONTEXT.md): antecedentes del vocabulario.

[Volver al índice general](../README.md)
