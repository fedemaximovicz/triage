# 08. Desarrollo y diagnóstico

[Índice general](../README.md) · [Anterior: persistencia](07-persistencia-y-estado.md)

## Índice

- [Dónde realizar cambios](#dónde-realizar-cambios)
- [Comprobaciones disponibles](#comprobaciones-disponibles)
- [Diagnóstico por síntoma](#diagnóstico-por-síntoma)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Mantener la documentación](#mantener-la-documentación)
- [Referencias](#referencias)

## Dónde realizar cambios

| Objetivo | Archivos que revisar y efectos relacionados |
| --- | --- |
| Cambiar entrevista o formato de respuesta | [actions.ts](../../src/app/actions.ts): prompt inicial, `buildInstructedMessage`, extracción y validación |
| Agregar un campo al panel generado | Contratos de [actions.ts](../../src/app/actions.ts) y [CaseView](../../src/components/CaseView.tsx), prompt y [panel](../../src/components/RecommendationPanel.tsx) |
| Cambiar inicio/descarte/envío | [CaseView](../../src/components/CaseView.tsx), acciones y transacciones de [db.ts](../../src/lib/db.ts) |
| Cambiar reglas de prioridad humana | [RecommendationPanel](../../src/components/RecommendationPanel.tsx) y selección de nivel en [casos/page.tsx](../../src/app/casos/page.tsx) |
| Cambiar modelo o host | [.env.example](../../.env.example), defaults de acciones/RAG y configuración local |
| Cambiar recuperación | [rag.ts](../../src/lib/rag.ts): lectura, fragmentación, hash, top-k y umbral; después repetir la [evaluación del umbral](06-rag.md#calibración-del-umbral) |
| Agregar conocimiento | [knowledge/](../../knowledge/); revisar cada archivo porque no hay filtro de aprobación |
| Guardar otro dato | Esquema, migración y consultas en [db.ts](../../src/lib/db.ts), acción de servidor y consumidor |
| Cambiar aspecto global | [globals.css](../../src/app/globals.css), componentes y [layout.tsx](../../src/app/layout.tsx) |

El contrato de datos atraviesa varias capas. Agregar una propiedad al prompt no implica que se valide, se muestre o se guarde. De igual modo, agregar una columna no hace que se restaure el estado del caso.

## Comprobaciones disponibles

[package.json](../../package.json) contiene scripts `dev`, `build`, `start`, `lint` y `eval:similarity`. No incluye `test` ni una suite automatizada de pruebas del comportamiento. Las comprobaciones técnicas disponibles con dependencias instaladas son:

```sh
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Además, la evaluación del umbral de similitud mide la recuperación con consultas sintéticas:

```sh
pnpm eval:similarity
```

Necesita Ollama activo con el modelo de `OLLAMA_EMBED_MODEL` descargado y, para no compartir `.rag-index/`, conviene correrla con el servidor de desarrollo detenido. Un fallo de Ollama o del modelo es un problema de entorno, no de la evaluación. Qué informa y cómo leerla está en [calibración del umbral](06-rag.md#calibración-del-umbral).

Lint y tipos no verifican que el modelo responda ni que un documento adecuado aparezca entre los resultados. La compilación también puede necesitar red para las fuentes configuradas. Un problema de runtime, permisos o descarga debe registrarse separadamente de un fallo de implementación.

Para cambios de comportamiento, usar datos sintéticos y comprobar el recorrido afectado:

| Cambio | Comprobación manual relevante |
| --- | --- |
| Apertura/chat | Crear caso, recibir apertura y enviar mensaje; comprobar respuesta y panel |
| Contrato JSON | Revisar campo válido, omitido e inválido, y respuesta sin JSON; distinguir `null` de `{}` |
| Prioridad humana | Elegir/aceptar/anular, recibir otra sugerencia y comprobar que no desplaza la selección; probar Deshacer |
| Persistencia | Guardar nombre, nota y decisión; consultar registro y lista; verificar que descartar oculta sin borrar |
| RAG | Construir, reutilizar tras reinicio, cambiar corpus e iniciar nuevo caso; comprobar corpus vacío y error de embeddings |
| Datos manuales | Corregir signo, enviar otro turno y verificar prioridad; comprobar que no se promete restauración tras recargar |

Estas son pautas de verificación, no resultados de pruebas ya ejecutadas. Una revisión documental requiere además comprobar enlaces, anclas, rutas, valores y correspondencia con el código; no necesita producir nuevos casos para validar el formato Markdown.

## Diagnóstico por síntoma

| Síntoma | Qué revisar |
| --- | --- |
| `pnpm.ps1` bloqueado | Política de ejecución de PowerShell; el fallo ocurre antes de ejecutar la aplicación |
| Error relacionado con `node:sqlite` | Versión de Node usada por el proceso; el entorno de referencia es Node 24 |
| La aplicación no compila por fuentes | Error de descarga de `next/font/google` y conectividad del entorno |
| Falla la apertura | Ollama activo, host, modelo conversacional descargado y logs de Next.js |
| Apertura correcta, primer mensaje falla | Modelo de `OLLAMA_EMBED_MODEL` descargado, lectura de `knowledge/`, permisos de escritura del índice y logs `[rag]` |
| Primer turno demora | Construcción aún en curso o carga/inferencia de modelos; el chat espera respuesta completa |
| Aparece advertencia de índice ilegible | La carga interna falló y el código intenta reconstruir; revisar permisos y error original |
| Cambié documentos y no veo efecto | El índice en memoria no revisa archivos por mensaje; iniciar otro caso o reiniciar el proceso |
| Cambié chunking y se reutiliza índice viejo | Tamaño y solapamiento no están en el hash; invalidar índice con servidor detenido |
| No se ven fuentes recuperadas | La interfaz no muestra citas y el contrato de recuperación devuelve solo texto |
| Respuesta aparentemente sin RAG | Corpus vacío, resultados bajo el umbral o consulta demasiado corta; una respuesta no prueba recuperación |
| Panel conserva valores tras una respuesta | Puede haber JSON inválido (`null`) o ausencia de un nuevo nivel; consultar reglas del panel |
| Desaparecen antecedentes o motivo | Un objeto válido reemplaza campos; los omitidos vuelven a placeholders, salvo nivel/confianza |
| Cambia la sugerencia pero no la tarjeta | Una selección humana tiene prioridad; se puede mostrar «IA sugiere» |
| Recargar pierde la conversación visible | No hay restauración del estado desde la base de datos |
| La lista no coincide con el panel | Guardado fallido, selección provisional no confirmada o distinto criterio de conservación del motivo |
| Datos parecen cruzarse entre casos | Motor compartido por proceso; `caseId` no separa la memoria |

Los errores del panel al guardar decisión, nombre o nota aparecen en la consola del navegador. Las operaciones de Ollama, índice y SQLite se ejecutan en el servidor; revisar también la terminal de Next.js. No hay una pantalla de salud ni una traza de recuperación expuesta al usuario.

Para investigar la relevancia del RAG en desarrollo, correr `pnpm eval:similarity`, que usa `searchKnowledge` y muestra los puntajes antes del filtro para consultas sintéticas. Para un caso concreto, inspeccionar con un depurador `searchKnowledge`, `retrieveContext` y el contenido enviado por `buildContextMessage`, también con datos sintéticos. La aplicación no registra métricas de recuperación ni un informe de fuentes por turno.

## Limitaciones conocidas

La memoria del chat se comparte por módulo y no está aislada por caso. Las protecciones de interfaz y construcción de índice no coordinan varios procesos. SQLite y la memoria del modelo pueden divergir si falla una etapa posterior a la inferencia.

No hay autenticación ni atribución de decisiones a usuarios. El corpus incluye borradores y pruebas; no hay filtro por estado, validación clínica automatizada ni motor determinista de reglas. La confianza del modelo no está calibrada en el repositorio. El umbral RAG (`0.30`) se midió con consultas sintéticas ([ADR 0013](../adr/0013-similarity-threshold-measured-on-embeddinggemma.md)); eso mide si la búsqueda encuentra el texto, no su validez clínica.

La interfaz no implementa adjuntos, página de Documentos, reapertura de casos ni el botón Reintentar de los tickets históricos. Tampoco hay streaming, timeout propio, resumen explícito de conversación o recuperación de mensajes desde SQLite al iniciar la pantalla.

Estas limitaciones describen trabajo pendiente; documentarlas no las resuelve ni cambia el alcance del código.

## Mantener la documentación

Al modificar el proyecto, actualizar primero la guía que explica el comportamiento afectado. Mantener valores concretos en su sección de referencia y enlazarla desde las demás. Revisar que los ejemplos correspondan al contrato vigente.

Conservar los ADR como historia de decisiones. Si una decisión se reemplaza, indicar la relación en el [índice de ADR](../adr/README.md) y documentar el resultado actual en las guías. Los tickets conservan sus criterios originales; su índice aclara diferencias conocidas.

Los documentos nuevos deben tener índice de secciones, enlaces relativos al código y regreso al índice general. No colocar guías técnicas en `knowledge/`: el recuperador indexaría sus instrucciones como parte del corpus.

## Referencias

- [Arquitectura](03-arquitectura-y-componentes.md).
- [Memoria y fallos](05-integracion-ollama.md#memoria-y-fallos).
- [Actualización del corpus](06-rag.md#actualizar-la-base-de-conocimiento).
- [Persistencia y estado](07-persistencia-y-estado.md).

[Volver al índice general](../README.md)
