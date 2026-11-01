# 05. Integración con Ollama

[Índice general](../README.md) · [Anterior: flujo de un caso](04-flujo-de-un-caso.md) · [Siguiente: RAG](06-rag.md)

## Índice

- [Responsabilidades y configuración](#responsabilidades-y-configuración)
- [Creación del motor](#creación-del-motor)
- [Construcción de la petición](#construcción-de-la-petición)
- [Contrato de respuesta](#contrato-de-respuesta)
- [Ejemplo de un turno](#ejemplo-de-un-turno)
- [Memoria y fallos](#memoria-y-fallos)
- [Referencias](#referencias)

## Responsabilidades y configuración

Ollama ejecuta los modelos; Next.js decide qué mensajes enviar y cómo interpretar las respuestas. El acceso se realiza en [actions.ts](../../src/app/actions.ts) mediante `Ollama`, de `@llamaindex/ollama`. `SimpleChatEngine`, de `llamaindex`, aporta el motor y su memoria.

| Uso | Cliente | Modelo por defecto | Módulo |
| --- | --- | --- | --- |
| Generar conversación y recomendación | `Ollama` | `llama3.2:3b` | `actions.ts` |
| Representar documentos y consultas como vectores | `OllamaEmbedding` | `embeddinggemma` | `rag.ts` |

Ambos usan `OLLAMA_BASE_URL`, por defecto `http://127.0.0.1:11434`. `OLLAMA_MODEL` y `OLLAMA_EMBED_MODEL` permiten cambiar cada modelo por separado. El chat solicita temperatura `0` y `num_ctx` de `OLLAMA_NUM_CTX`, con valor predeterminado 8192. Ver [configuración](02-instalacion-y-configuracion.md#configurar-el-entorno).

La integración actual no usa Gemini, credenciales de Google ni selección de proveedor. Los ADR 0002 y 0004 describen etapas anteriores, reemplazadas por el ADR 0008.

## Creación del motor

`activeEngine()` crea el `SimpleChatEngine` al necesitar el primer turno y lo conserva en la variable de módulo `chatEngine`. Las variables de entorno se leen al construirlo, no al importar el archivo.

La aplicación no descarga modelos ni comprueba anticipadamente que Ollama esté disponible. Si el servicio está detenido o falta el modelo solicitado, la llamada falla y el cliente muestra su error genérico.

Aunque se utiliza `SimpleChatEngine`, el turno no llama a `engine.chat()`. `runTurn()` combina manualmente su memoria y `engine.llm.chat()` para insertar contexto que solo debe existir durante esa petición. Tampoco utiliza `ContextChatEngine`: la recuperación se hace por separado con el texto original del profesional.

## Construcción de la petición

Para un mensaje normal, `chat()` realiza primero la recuperación RAG y valida los datos manuales. Luego `runTurn()`:

1. Construye el mensaje con `buildInstructedMessage(query)`: texto original más instrucciones para responder en español y terminar con JSON.
2. Agrega ese mensaje como `user` a la memoria.
3. Obtiene el historial que la memoria entrega al LLM mediante `getLLM(engine.llm)`.
4. Inserta el contexto de ese turno justo antes del último mensaje de usuario.
5. Ejecuta `engine.llm.chat({ messages, stream: false })` y agrega la respuesta completa a la memoria.
6. Extrae la prosa y valida la recomendación para devolverlas al cliente.

El orden enviado es:

```text
Historial anterior entregado por la memoria
system: fragmentos recuperados, si existen
system: nombre y signos manuales, si existen
user: texto actual + instrucciones de respuesta
```

Los dos mensajes `system` temporales no se agregan a la memoria. El de RAG indica que los fragmentos son referencia y que los datos del profesional tienen prioridad. El de datos manuales indica que estos prevalecen sobre lo leído en la conversación. Estas son instrucciones al modelo, no validaciones deterministas de su respuesta.

El servidor admite hasta 12 signos manuales, con `label`, `value` y `unit` de hasta 100 caracteres por campo, y un nombre recortado de hasta 100 caracteres. Descarta las piezas inválidas sin rechazar todo el turno. La nota y el nivel elegido en el panel no forman parte de este contexto.

En la apertura, `startCase()` reinicia la memoria y usa `INITIAL_TRIAGE_PROMPT`: solicita saludo breve, una pregunta a la vez y continuación de la entrevista. También pasa por `buildInstructedMessage`, pero no recupera documentos ni incorpora datos manuales.

## Contrato de respuesta

Se pide prosa seguida de un bloque de código JSON al final. No se envía un esquema JSON estricto al servicio de Ollama: la aplicación depende del prompt y de un parser posterior.

Todos los campos de `Recommendation` son opcionales:

| Campo | Validación implementada |
| --- | --- |
| `motivo`, `antecedentes` | Deben ser strings; el validador permite strings vacíos |
| `signosVitales` | Lista de objetos con `label`, `value` y `unit` string; conserva hasta cinco válidos |
| `nivel` | Una de `rojo`, `naranja`, `amarillo`, `verde`, `azul`; sin conversiones |
| `confianza` | Número finito; no comprueba rango 0–100 ni que sea entero |
| `razonamiento` | Lista no vacía de strings |
| `informacionFaltante` | Lista no vacía de strings |
| `proximosPasos` | Lista no vacía de strings |

Un campo inválido se omite sin invalidar los demás. Un objeto vacío es una recomendación válida; un valor raíz que no sea objeto, o un arreglo, produce `null`.

`extractJsonBlock()` toma el último bloque delimitado que coincide con su expresión de bloques JSON o sin etiqueta. La prosa es el texto anterior a ese bloque. Si no hay bloque, intenta interpretar un objeto JSON que llegue hasta el final de la respuesta. Si tampoco lo encuentra, devuelve todo el texto como prosa y ninguna recomendación. Un bloque encontrado pero con JSON inválido produce `recommendation: null`; no hay una segunda inferencia automática.

El prompt pide una confianza entera de 0 a 100, pero el validador es más permisivo. El panel convierte valores menores o iguales a 1 en porcentajes, salvo exactamente `1`, que trata como ambiguo y no muestra. Redondea y no limita explícitamente el rango. Este número es una declaración del modelo, no una probabilidad clínica calibrada.

## Ejemplo de un turno

Ejemplo sintético para entender el transporte, sin asignar una categoría clínica: el profesional escribe «Paciente de prueba con un síntoma de ejemplo». Si hay nombre o signos manuales, se envían como contexto separado. El recuperador busca con esa frase, y puede devolver fragmentos o una lista vacía.

Una respuesta posible para ilustrar el formato sería:

````text
¿Desde cuándo presenta el síntoma?

```json
{
  "motivo": "Síntoma de ejemplo",
  "informacionFaltante": ["Duración del síntoma"]
}
```
````

El chat muestra la pregunta. El panel recibe el motivo y la información faltante. Si ya mostraba nivel y confianza, los conserva porque aquí no hay `nivel`. SQLite guarda la frase original, la pregunta de IA y el motivo; la memoria del modelo conserva el mensaje con instrucciones y la respuesta completa con JSON.

Los fragmentos RAG no se insertan directamente en memoria ni en SQLite. Su contenido sí puede verse reflejado en una respuesta del modelo, que luego se conserva: la exclusión de los mensajes temporales no garantiza que el modelo nunca repita esa información.

## Memoria y fallos

La memoria pertenece al servidor, no a Ollama ni a la base SQLite. `caseId` no separa conversaciones: todas las llamadas del mismo módulo usan el motor compartido. `resetChatEngine()` descarta ese motor; no modifica SQLite ni el índice RAG.

La ventana `num_ctx` es finita. Separar el contexto temporal evita acumular copias de los fragmentos, pero los mensajes instruidos y las respuestas con JSON siguen ocupando memoria. La aplicación no implementa un resumen propio, un contador visible de tokens ni avisos de pérdida de contexto. El ADR 0008 documenta la truncación como motivo para fijar 8192.

Las operaciones de memoria y SQLite no forman una transacción conjunta:

- Si falla la recuperación, todavía no se agregó el mensaje a memoria.
- Si falla la llamada al LLM, el mensaje de usuario ya fue agregado; no se revierte.
- Si la generación funciona pero falla `saveTurn`, la memoria ya incluye la respuesta, aunque la interfaz reciba un error y el turno no quede guardado.

La aplicación usa `stream: false` y espera la respuesta completa. No define un timeout propio ni una estrategia propia de reintentos; esto no describe posibles comportamientos internos de las bibliotecas.

## Referencias

- [Implementación de acciones y prompts](../../src/app/actions.ts).
- [Contrato original: ADR 0003](../adr/0003-recommendation-json-contract.md).
- [Integración local: ADR 0008](../adr/0008-local-ollama-via-llamaindex.md).
- [RAG y contexto temporal](06-rag.md) y [persistencia](07-persistencia-y-estado.md).

[Volver al índice general](../README.md)
