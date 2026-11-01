# 07. Persistencia y estado

[Índice general](../README.md) · [Anterior: RAG](06-rag.md) · [Siguiente: desarrollo](08-desarrollo-y-diagnostico.md)

## Índice

- [Cuatro lugares donde vive la información](#cuatro-lugares-donde-vive-la-información)
- [Esquema SQLite](#esquema-sqlite)
- [Operaciones de escritura](#operaciones-de-escritura)
- [Consulta de casos](#consulta-de-casos)
- [Recarga reinicio y conservación](#recarga-reinicio-y-conservación)
- [Referencias](#referencias)

## Cuatro lugares donde vive la información

| Lugar | Contenido | Duración y límites |
| --- | --- | --- |
| Estado React | Caso visible, mensajes, recomendación, selección humana, campos editables | Dura mientras se conserva la instancia de la interfaz; no se restaura desde SQLite |
| Memoria de `chatEngine` | Mensajes con instrucciones y respuestas completas, incluido JSON | Vive en el proceso del servidor; se descarta al reiniciar el motor o proceso |
| SQLite, `.data/triage.db` | Casos, mensajes visibles exitosos, nivel/motivo, decisión, nota y nombre | Persiste entre reinicios; no contiene todo el estado de pantalla o del modelo |
| Índice, `.rag-index/` | Documentos fragmentados, vectores y datos para recuperar contexto | Persiste y se reutiliza entre casos; reconstruible desde corpus/modelo |

El contexto RAG y los datos manuales enviados como mensajes temporales no se guardan directamente en la memoria conversacional. La respuesta del modelo puede repetirlos, de modo que su contenido sí podría quedar reflejado en los mensajes guardados.

## Esquema SQLite

[db.ts](../../src/lib/db.ts) crea `.data/`, abre `DatabaseSync` y prepara el esquema en el primer acceso. No utiliza ORM ni un servidor de base de datos separado.

La tabla `cases` guarda:

| Columna | Contenido |
| --- | --- |
| `id` | Entero autoincremental usado como número del caso; secuencia inicial preparada para comenzar en 2451 |
| `started_at` | Inicio como string ISO generado por el servidor |
| `status` | `en_curso` o `descartado`; inicialmente `en_curso` |
| `nivel_ia` | Último nivel recibido de IA; admite `NULL` |
| `motivo` | Último motivo recibido de IA; admite `NULL` |
| `decision` | `aceptado`, `anulado` o `NULL` |
| `nivel_final` | Nivel asociado a la decisión humana; admite `NULL` |
| `nota` | Texto de nota o `NULL` |
| `paciente` | Nombre ingresado por el profesional o `NULL` |
| `updated_at` | Fecha ISO de la última escritura del caso |

La tabla `messages` guarda:

| Columna | Contenido |
| --- | --- |
| `id` | Entero autoincremental del mensaje |
| `case_id` | Identificador del caso; el esquema declara una referencia a `cases(id)` |
| `kind` | `nurse` para el profesional o `ai` para el modelo |
| `text` | Texto original del profesional o prosa extraída de IA |
| `created_at` | Fecha ISO de guardado |

No hay tablas de usuarios, signos vitales, recomendaciones completas, documentos recuperados o auditoría de cambios. La base no registra quién realizó una acción. El módulo no configura explícitamente pragmas de SQLite; la documentación no presupone una política adicional de concurrencia o integridad fuera de lo configurado por el runtime.

La creación usa `CREATE TABLE IF NOT EXISTS`. Para bases anteriores a la edición del nombre, consulta `PRAGMA table_info(cases)` y agrega `paciente` con `ALTER TABLE` si falta. Esta es una migración específica en código, no un sistema general de migraciones versionadas.

## Operaciones de escritura

| Operación | Escritura |
| --- | --- |
| `insertCase()` | Inserta caso y devuelve número/fecha |
| `insertCase(discardId)` | Marca el anterior como descartado e inserta el nuevo dentro de una transacción |
| `saveTurn()` | Inserta los mensajes del turno y actualiza nivel/motivo en una transacción |
| `saveDecision()` | Reemplaza juntos `decision` y `nivel_final`; `NULL` limpia ambos |
| `saveNote()` | Actualiza nota y fecha |
| `savePatientName()` | Actualiza nombre y fecha |

`inTransaction()` ejecuta `BEGIN`, `COMMIT` o `ROLLBACK`. En los turnos normales, la escritura comienza después de generar e interpretar la respuesta. Si falla la escritura, no queda guardado solo uno de los dos mensajes del turno.

`saveTurn()` usa `COALESCE` para nivel y motivo: un campo omitido conserva el valor anterior. Esto difiere de la representación del panel, donde el motivo omitido en un objeto válido vuelve al placeholder. La lista puede mostrar el último motivo guardado aunque el panel de ese turno ya no lo muestre.

La apertura guarda solo la prosa del modelo. No se guardan el prompt inicial, las instrucciones JSON, los fragmentos de RAG, los mensajes temporales de datos manuales ni las burbujas de error. Tampoco se guarda el JSON completo: solo se extraen `nivel` y `motivo` para `cases`.

Los signos vitales manuales y los demás campos de la recomendación no tienen columnas propias. Pueden aparecer mencionados en la prosa guardada, pero no se persisten como campos estructurados. La nota se guarda independientemente y no se envía al modelo por el mero hecho de escribirla.

Las decisiones se guardan de forma asíncrona desde el panel sin esperar confirmación para actualizar la interfaz. Un fallo solo se registra en consola. Por eso lo mostrado no certifica que SQLite haya recibido el último cambio. La generación, la memoria del modelo y estas escrituras no forman una transacción distribuida.

## Consulta de casos

`listOpenCases()` selecciona casos `en_curso`, ordenados por `id DESC`. Devuelve número, fecha, nombre, motivo y niveles/decisión. No carga mensajes ni nota.

[casos/page.tsx](../../src/app/casos/page.tsx) usa `force-dynamic` para leer en cada solicitud. Muestra primero el nivel humano válido cuando hay una decisión; en otro caso, el nivel de IA válido. La fecha de esta página se formatea en el servidor sin zona horaria explícita. La hora del encabezado del caso activo se formatea en el navegador; ambos pueden diferir si los entornos usan zonas distintas.

## Recarga reinicio y conservación

| Evento | Resultado |
| --- | --- |
| Recargar `/` | Se pierde el estado React; SQLite no se borra y no reconstruye la vista |
| Reiniciar Next.js | Se pierde la memoria de chat y la caché del índice; SQLite e índice en disco permanecen |
| Iniciar otro caso | Se reinicia el chat; se vuelve a comprobar el corpus al preparar el índice |
| Descartar | Se limpia la sesión visible, se marca el caso y se conserva su registro |
| Retirar el índice con servidor detenido | Puede reconstruirse; no elimina casos |
| Eliminar `.data/triage.db` | Se pierden los registros de esa base; no es una operación de limpieza del RAG |

La aplicación no ofrece copias de seguridad, restauración ni reapertura de entrevistas. Para conservar datos de una instalación local, detener el proceso antes de copiar su almacenamiento y preservar `.data/` por separado de la caché vectorial. `.gitignore` evita versionar estos archivos; no cifra ni controla el acceso al contenido.

## Referencias

- [Esquema y SQL](../../src/lib/db.ts).
- [ADR 0010](../adr/0010-cases-persisted-in-local-sqlite.md) y [ADR 0011](../adr/0011-clinician-edits-in-the-panel.md).
- [Memoria y fallos del modelo](05-integracion-ollama.md#memoria-y-fallos).

[Volver al índice general](../README.md)
