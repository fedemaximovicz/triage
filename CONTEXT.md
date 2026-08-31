# CONTEXT — Glossary

**Manchester (nivel de triage)** — escala de 5 colores: rojo (atención inmediata), naranja (muy urgente), amarillo (urgente), verde (estándar), azul (no urgente). Escala oficial de la app. NOT: ESI.
**Nuevo caso** — la pantalla principal: conversación clínico↔IA + panel de recomendación. NOT: formulario estructurado.
**Anular** — override manual del clínico que fija el nivel de triage a mano; gana sobre cualquier sugerencia posterior de la IA hasta que se deshaga o se descarte el caso. NOT: editar la sugerencia de la IA.
**Aceptar** — confirmación del clínico del nivel sugerido; fija el nivel igual que Anular y la IA deja de poder moverlo, hasta que se deshaga o se descarte el caso. NOT: descartar la sugerencia.
**Iniciar caso** — arranca un caso desde el estado vacío: fija número y hora, resetea la sesión del modelo y dispara el prompt inicial de triage. NOT: limpiar el panel.
**Descartar caso** — tira el caso en curso entero (conversación, panel, decisión humana, nota y memoria del modelo) y arranca otro en el acto; pide confirmación. NOT: Reiniciar caso, que ya no existe.
**Prompt inicial de triage** — mensaje fijo e invisible que se manda al iniciar un caso; el clínico sólo ve la respuesta de la IA. NOT: un mensaje del clínico.
**Deshacer** — ventana corta tras Aceptar o Anular para soltar la decisión humana y devolver el nivel al control de la IA. NOT: cambiar el nivel a mano.
