# Documentación de TriageAI

[Volver al proyecto](../README.md)

Las guías describen el código revisado el **31 de octubre de 2026**. Están dirigidas a personas que necesitan comprender, ejecutar o modificar el proyecto sin haber participado en su desarrollo.

## Índice

- [Recorridos de lectura](#recorridos-de-lectura)
- [Guías del funcionamiento actual](#guías-del-funcionamiento-actual)
- [Antecedentes y referencias](#antecedentes-y-referencias)
- [Cómo interpretar la documentación](#cómo-interpretar-la-documentación)

## Recorridos de lectura

| Necesidad | Recorrido |
| --- | --- |
| Primera aproximación | Visión general → Arquitectura → Flujo de un caso |
| Ejecutar el proyecto | Instalación → Flujo de un caso → Diagnóstico |
| Comprender RAG y Ollama | Arquitectura → Ollama → RAG → Persistencia |
| Modificar la aplicación | Arquitectura → Guía del componente → Desarrollo → ADR relacionados |

## Guías del funcionamiento actual

| Guía | Preguntas que responde |
| --- | --- |
| [01. Visión general](guia/01-vision-general.md) | ¿Qué hace el proyecto? ¿Qué conceptos usa y qué está implementado? |
| [02. Instalación y configuración](guia/02-instalacion-y-configuracion.md) | ¿Cómo se prepara y ejecuta? ¿Qué modelos y variables necesita? |
| [03. Arquitectura y componentes](guia/03-arquitectura-y-componentes.md) | ¿Dónde vive cada responsabilidad y cómo se comunican las partes? |
| [04. Flujo de un caso](guia/04-flujo-de-un-caso.md) | ¿Qué sucede al iniciar, conversar, decidir y descartar? |
| [05. Integración con Ollama](guia/05-integracion-ollama.md) | ¿Cómo se construye la petición, se mantiene la memoria y se interpreta la respuesta? |
| [06. RAG](guia/06-rag.md) | ¿Cómo se indexa, recupera y utiliza la base de conocimiento? |
| [07. Persistencia y estado](guia/07-persistencia-y-estado.md) | ¿Qué se guarda, dónde y qué se pierde al recargar? |
| [08. Desarrollo y diagnóstico](guia/08-desarrollo-y-diagnostico.md) | ¿Qué archivos modificar y cómo investigar problemas? |

## Antecedentes y referencias

- [Índice de ADR](adr/README.md): decisiones de arquitectura y su evolución.
- [Índice de especificaciones](specs/README.md): requisitos detallados de etapas del proyecto.
- [Índice de tickets](tickets/README.md): tareas y criterios de aceptación históricos.
- [Descripción del proyecto](ProjectDescription.md) y [requerimientos](requerimientos.md): objetivos y alcance propuesto.
- [Glosario original](../CONTEXT.md): vocabulario utilizado durante el desarrollo.
- [Mockup de referencia](reference/mockup-nuevo-caso.html) y [prototipo HTML](TriageAI.html): antecedentes visuales.
- [Base de conocimiento](../knowledge/): entradas que el código puede indexar; no equivale a documentación técnica vigente.

## Cómo interpretar la documentación

El código es la referencia del comportamiento implementado. Los ADR explican decisiones, pero algunos fueron reemplazados o extendidos. Los tickets registran objetivos de una etapa y no demuestran por sí solos que una función siga disponible.

Por ejemplo, los primeros ADR usan Gemini; el servidor actual usa Ollama. El ticket 13 describe un botón Reintentar que no está en el componente actual. Los documentos técnicos dentro de `knowledge/` proponen filtros y reglas que el recuperador todavía no aplica.

Las guías incluyen enlaces a los módulos, tablas de parámetros y diagramas Mermaid. En un visor sin soporte Mermaid, los diagramas se muestran como código; el texto explica también esos recorridos. Al cambiar un contrato, una variable o un flujo, actualizar la guía relacionada y revisar sus enlaces.
