---
id: "KB-21"
titulo: "Privacidad y registro clínico"
version: "0.1.0"
fecha_consulta: "2026-10-28"
idioma: "es-AR"
pais: "Argentina"
ambito: "guardia_presencial"
tipo: "contexto_y_diseno"
poblacion: "mixta_segun_alcance_del_texto"
estado: "borrador_no_validado"
uso_asistencial_habilitado: false
fuentes: ["S06", "S07"]
---

# Privacidad y registro clínico

## Marco de referencia

La Ley 25.326 considera sensibles los datos de salud y exige condiciones de seguridad y confidencialidad. La Ley 26.529 regula derechos del paciente y documentación clínica. El tratamiento de datos asistenciales debe revisarse con los responsables institucionales. [S06, S07]

## Controles técnicos propuestos

- Mantener separadas la base documental de protocolos y la historia individual del paciente.
- No insertar historias clínicas identificables en el índice vectorial general.
- Para docencia y pruebas, usar casos sintéticos o datos con disociación evaluada; quitar el nombre no basta si otros datos identifican.
- Aplicar acceso por rol, cifrado, retención definida y trazabilidad de consultas.
- Evitar nombres, DNI, domicilios, teléfonos o texto clínico identificable en telemetría y registros de depuración.
- Verificar servicios de embeddings, reranking, sincronización y logs: ejecutar Ollama localmente no garantiza por sí solo que todo el sistema sea local.
- Evaluar base legal, finalidad, acceso, encargados y transferencias antes de tratar datos reales; no suponer que todo uso exige la misma forma de consentimiento ni que el consentimiento autoriza cualquier reutilización.

## Registro

Conservar qué recomendó el sistema, evidencia recuperada, versión del modelo, corrección del profesional y decisión final, bajo las políticas institucionales. No modificar silenciosamente registros previos. Los plazos de conservación de historia clínica y logs técnicos deben definirse por su régimen correspondiente.

## Referencias

- [S06 — Ley 26.529 — Derechos del paciente](https://www.argentina.gob.ar/normativa/nacional/160432/actualizacion). Alcance y límites: [registro de fuentes](26_FUENTES.md), entrada S06.
- [S07 — Ley 25.326 — Protección de datos personales](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion). Alcance y límites: [registro de fuentes](26_FUENTES.md), entrada S07.
