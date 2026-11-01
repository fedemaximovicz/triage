// Synthetic queries for calibrating SIMILARITY_THRESHOLD (ticket 25). Lives outside
// knowledge/ on purpose: anything in that folder is indexed. No real patient data.
//
// `expected` is the one document of the base de conocimiento that should come back
// for the query, or null when nothing should: off-topic text, and short replies
// that are searched on their own without the interview (ADR 0009).

export type EvalQuery = {
  id: string;
  kind: "topic" | "off-topic" | "short-reply";
  query: string;
  expected: string | null;
};

export const EVAL_QUERIES: EvalQuery[] = [
  // 07 — dolor torácico
  { id: "toracico-opresivo", kind: "topic", expected: "07_DOLOR_TORACICO.md", query: "Paciente de 58 años con dolor opresivo en el pecho desde hace una hora que se irradia al brazo izquierdo." },
  { id: "toracico-ecg", kind: "topic", expected: "07_DOLOR_TORACICO.md", query: "Dolor torácico agudo, necesito saber en cuánto tiempo hay que hacer el electrocardiograma." },

  // 08 — neurológico
  { id: "neuro-acv", kind: "topic", expected: "08_NEUROLOGICO.md", query: "Mujer de 70 años con debilidad súbita en el brazo derecho y dificultad para hablar." },
  { id: "neuro-convulsion", kind: "topic", expected: "08_NEUROLOGICO.md", query: "Tuvo una convulsión hace diez minutos y ahora está somnoliento." },

  // 09 — respiratorio
  { id: "resp-disnea", kind: "topic", expected: "09_RESPIRATORIO.md", query: "Hombre con falta de aire intensa, no puede completar frases, saturación 88%." },
  { id: "resp-alergia", kind: "topic", expected: "09_RESPIRATORIO.md", query: "Urticaria y labios hinchados después de tomar un antibiótico, le cuesta respirar." },

  // 10 — infección y sepsis
  { id: "sepsis-fiebre", kind: "topic", expected: "10_INFECCION_SEPSIS.md", query: "Fiebre de 39 con escalofríos, taquicardia y confusión, antecedente de infección urinaria." },

  // 11 — trauma, hemorragia y quemaduras
  { id: "trauma-hemorragia", kind: "topic", expected: "11_TRAUMA_HEMORRAGIA.md", query: "Cayó de una moto y tiene una herida en el muslo que sangra mucho." },
  { id: "trauma-quemadura", kind: "topic", expected: "11_TRAUMA_HEMORRAGIA.md", query: "Quemadura con agua hirviendo en el antebrazo de un adulto." },

  // 12 — abdomen y presentaciones sin ficha
  { id: "abdomen-agudo", kind: "topic", expected: "12_ABDOMEN_Y_OTROS.md", query: "Dolor abdominal fuerte en la parte baja derecha con vómitos desde anoche." },
  { id: "abdomen-lumbar", kind: "topic", expected: "12_ABDOMEN_Y_OTROS.md", query: "Dolor lumbar intenso sin golpe previo, no hay ficha para esto." },

  // 13 — pediatría y recién nacidos
  { id: "pedia-neonato-fiebre", kind: "topic", expected: "13_PEDIATRIA.md", query: "Bebé de 20 días con fiebre de 38,2 que come poco y está decaído." },
  { id: "pedia-neonato-toma", kind: "topic", expected: "13_PEDIATRIA.md", query: "Recién nacido que rechaza la toma y duerme más de lo habitual." },

  // 14 — embarazo y puerperio
  { id: "embarazo-sangrado", kind: "topic", expected: "14_EMBARAZO_PUERPERIO.md", query: "Embarazada de 32 semanas con sangrado vaginal y dolor abdominal." },
  { id: "embarazo-movimientos", kind: "topic", expected: "14_EMBARAZO_PUERPERIO.md", query: "Embarazada que cuenta que el bebé se mueve menos desde ayer." },

  // 15 — dengue
  { id: "dengue-febril", kind: "topic", expected: "15_DENGUE.md", query: "Fiebre alta hace tres días, dolor detrás de los ojos y dolores musculares, vive en una zona con casos de dengue." },

  // 16 — intoxicaciones
  { id: "intox-co", kind: "topic", expected: "16_INTOXICACIONES.md", query: "Toda la familia con dolor de cabeza y náuseas después de usar una estufa en un cuarto cerrado." },
  { id: "intox-ingesta", kind: "topic", expected: "16_INTOXICACIONES.md", query: "Un niño tomó un producto de limpieza del envase." },

  // 17 — salud mental
  { id: "mental-autolesion", kind: "topic", expected: "17_SALUD_MENTAL.md", query: "Paciente de 25 años dice que quiere hacerse daño y que ya tiene un plan." },

  // 18 — vulnerabilidad
  { id: "vulnerable-deterioro", kind: "topic", expected: "18_VULNERABILIDAD.md", query: "Persona mayor con deterioro cognitivo que no puede decir dónde le duele." },

  // 19 — reevaluación
  { id: "reeval-espera", kind: "topic", expected: "19_REEVALUACION.md", query: "Lleva cuatro horas en la sala de espera y ahora dice que se siente peor." },

  // 20 — derivación
  { id: "derivacion-traslado", kind: "topic", expected: "20_DERIVACION.md", query: "Hay que trasladar al paciente a un hospital de mayor complejidad, ¿qué datos se entregan?" },

  // 21 — privacidad
  { id: "privacidad-registro", kind: "topic", expected: "21_PRIVACIDAD.md", query: "¿Qué datos del paciente puedo registrar y quién puede ver la historia clínica?" },

  // Off-topic: nothing should come back
  { id: "fuera-futbol", kind: "off-topic", expected: null, query: "¿Quién ganó el partido de fútbol anoche?" },
  { id: "fuera-receta", kind: "off-topic", expected: null, query: "Receta de milanesas al horno con puré." },
  { id: "fuera-correo", kind: "off-topic", expected: null, query: "¿Cómo cambio la contraseña de mi correo electrónico?" },
  { id: "fuera-cine", kind: "off-topic", expected: null, query: "¿Qué película me recomendás para el fin de semana?" },

  // Short replies searched without the interview: nothing to anchor them to
  { id: "corta-si", kind: "short-reply", expected: null, query: "sí" },
  { id: "corta-no", kind: "short-reply", expected: null, query: "no" },
  { id: "corta-ayer", kind: "short-reply", expected: null, query: "desde ayer" },
  { id: "corta-horas", kind: "short-reply", expected: null, query: "hace dos horas" },
];
