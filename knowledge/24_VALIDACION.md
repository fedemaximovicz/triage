---
id: "KB-24"
titulo: "Evaluación antes de cualquier uso con pacientes"
version: "0.1.0"
fecha_consulta: "2026-10-28"
idioma: "es-AR"
pais: "Argentina"
ambito: "guardia_presencial"
tipo: "plan_propuesto"
poblacion: "mixta_segun_alcance_del_texto"
estado: "borrador_no_validado"
uso_asistencial_habilitado: false
fuentes: []
---

# Evaluación antes de cualquier uso con pacientes

## Qué puede verificarse con este paquete

Integridad documental, enlaces internos, correspondencia de fuentes, recuperación y cumplimiento del contrato de abstención. Eso no demuestra precisión clínica. Los casos sintéticos son pruebas iniciales de seguridad y no validación de Manchester.

## Evaluación clínica posterior

Un equipo de emergentología, enfermería de triage, pediatría y obstetricia debe definir la población, patrón de referencia, adjudicación de discrepancias y tamaño de muestra. Comparar contra clasificación experta con MTS autorizado, no contra respuestas de otro LLM ni solamente diagnóstico de egreso.

Separar entrenamiento, ajuste y evaluación por paciente y episodio para evitar fuga. Incluir otro período o centro cuando sea posible. Usar revisión ciega al resultado del modelo para definir referencia y realizar piloto en modo sombra, sin modificar atención.

## Métricas a preespecificar

- Subtriage: predicción menos urgente que la referencia; informar matriz completa y diferencia de niveles.
- Sobretriage: predicción más urgente; valorar carga asistencial y consecuencias.
- Sensibilidad para referencia 1–2, con intervalo de confianza y denominador definido.
- Abstención y cobertura: informar cuántos casos quedan sin propuesta; no excluirlos silenciosamente al calcular desempeño.
- Recuperación: evidencia pertinente entre resultados y ausencia de contaminación de escala.
- Fidelidad: proporción de afirmaciones con sustento real, citas inventadas y datos fabricados.
- Tiempos, fallos, deriva y resultados por edad, sexo, embarazo, idioma y centro cuando haya muestra adecuada.

## Criterios de aceptación

Deben fijarse antes del estudio por el comité clínico según riesgo. Este borrador no inventa un porcentaje universal de seguridad. Una sola prueba superada o una exactitud alta global no autorizan despliegue.

## Parada y reversión

Disponer de desactivación inmediata del componente y continuidad del triage manual. Investigar cualquier sugerencia de demora ante amenaza vital, color sin evidencia, mezcla de escala o filtración de información. Los incidentes de pruebas críticas bloquean el avance hasta corrección y nueva evaluación pertinente.
