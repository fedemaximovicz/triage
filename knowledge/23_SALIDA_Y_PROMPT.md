---
id: "KB-23"
titulo: "Plantilla de respuesta y controles de salida"
version: "0.1.0"
fecha_consulta: "2026-10-28"
idioma: "es-AR"
pais: "Argentina"
ambito: "guardia_presencial"
tipo: "especificacion_propuesta"
poblacion: "mixta_segun_alcance_del_texto"
estado: "borrador_no_validado"
uso_asistencial_habilitado: false
fuentes: []
---

# Plantilla de respuesta y controles de salida

## Instrucción base propuesta

> Sos un asistente de apoyo a profesionales de guardia. No reemplazás evaluación presencial. Usá solo evidencia recuperada aplicable y reglas autorizadas. No inventes datos, diagnósticos, discriminadores, citas ni colores. Priorizá comunicar amenazas vitales sin esperar información completa. Un dato faltante no es un hallazgo negativo. Si faltan criterios oficiales o datos esenciales, la prioridad MTS es indeterminada. No recomiendes alta, tratamiento o espera segura a partir de esta base. Diferenciá alerta asistencial inmediata de clasificación formal. Señalá conflictos y requerí validación profesional.

El prompt es un componente del prototipo; no es una barrera suficiente para uso asistencial.

## Ejemplo de contrato JSON: datos incompletos sin alerta identificada

```json
{
  "estado": "requiere_valoracion_profesional",
  "alerta_asistencial": "no_determinable",
  "prioridad_mts": null,
  "color_mts": null,
  "objetivo_atencion_mts_min": null,
  "hallazgos": [],
  "datos_pendientes": ["motivo de consulta", "edad", "valoración clínica inicial"],
  "accion": "Solicitar valoración presencial; los datos disponibles no permiten establecer prioridad ni seguridad de espera.",
  "sustento_mts": null,
  "evidencia": [{"documento_id": "KB-06", "seccion": "Regla de seguridad propuesta"}],
  "validacion_profesional": "pendiente",
  "uso_asistencial_habilitado": false
}
```

## Enumeraciones propuestas

`estado`: `alerta_inmediata`, `requiere_valoracion_profesional`, `propuesta_mts_pendiente_validacion`.

`alerta_asistencial`: `inmediata`, `sin_alerta_identificada_en_datos`, `no_determinable`. «Sin alerta identificada» no significa ausencia de riesgo.

`sustento_mts`, cuando se habilite, debe incluir versión, flujograma y discriminador oficial, referencias verificables y datos del caso que satisfacen el criterio. Las fuentes de contexto no cumplen esta condición.

## Validadores obligatorios del prototipo

- Con este paquete solo, `prioridad_mts`, `color_mts` y tiempo permanecen nulos en todos los casos individuales: faltan los algoritmos autorizados.
- Con reglas autorizadas incorporadas, un nivel propuesto requiere sustento completo y confirmación profesional para registrarse como final.
- Coherencia nivel/color/tiempo: 1/rojo/0, 2/naranja/10, 3/amarillo/60, 4/verde/120, 5/azul/240.
- Alerta inmediata implica acción de aviso inmediato, aunque la prioridad MTS sea nula.
- Si no existe sustento, no mostrar cero minutos como valor por defecto.
- Cada cita debe existir en el corpus y respaldar la afirmación concreta.
- No aceptar una salida malformada como clasificación. Fallar hacia revisión humana, sin bloquear atención.
