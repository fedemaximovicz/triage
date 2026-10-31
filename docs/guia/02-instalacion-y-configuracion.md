# 02. Instalación y configuración

[Índice general](../README.md) · [Anterior: visión general](01-vision-general.md) · [Siguiente: arquitectura](03-arquitectura-y-componentes.md)

## Índice

- [Requisitos](#requisitos)
- [Preparar dependencias y modelos](#preparar-dependencias-y-modelos)
- [Configurar el entorno](#configurar-el-entorno)
- [Ejecutar y comprobar](#ejecutar-y-comprobar)
- [Archivos generados](#archivos-generados)
- [Referencias](#referencias)

## Requisitos

| Requisito | Motivo |
| --- | --- |
| Node.js 24 | Entorno de referencia documentado en ADR 0010; el servidor usa `node:sqlite` |
| pnpm 11 | Gestor indicado en las instrucciones del repositorio; usar el lockfile existente |
| Ollama instalado y en ejecución | Ejecuta el modelo de conversación y el de embeddings |
| Espacio para modelos, índice y base de datos | Consumo dependiente de los modelos y del corpus |
| Permiso de escritura en la raíz del proyecto | Se crean `.data/`, `.rag-index/`, `.rag-index.tmp/` y `.next/` |

El proyecto no fija `engines` ni `packageManager` en [package.json](../../package.json). Esta guía usa las versiones de referencia del repositorio, no promete compatibilidad con versiones anteriores. La documentación de pnpm incluye Node.js 24 entre las versiones compatibles con pnpm 11: [instalación oficial](https://pnpm.io/installation).

Los comandos se ejecutan desde la raíz. La instalación de paquetes y la descarga de modelos requieren red. [layout.tsx](../../src/app/layout.tsx) también configura fuentes mediante `next/font/google`; una falla de descarga de fuentes puede afectar el desarrollo o la compilación aun cuando la inferencia use un modelo local.

## Preparar dependencias y modelos

Con los requisitos ya instalados:

```sh
node --version
pnpm --version
ollama --version
pnpm install --frozen-lockfile
ollama pull llama3.2:3b
ollama pull embeddinggemma
ollama list
```

No se necesita una API key para la inferencia local. Instalar y abrir Ollama según su [guía oficial](https://docs.ollama.com/quickstart). Si no hay un servicio activo, ejecutar en otra terminal:

```sh
ollama serve
```

El modelo de chat produce respuestas. El de embeddings transforma documentos y consultas en vectores. Descargar solo el primero permite responder la apertura, pero los mensajes posteriores fallarán si existe conocimiento para indexar y falta el segundo.

En PowerShell, una política de ejecución puede bloquear `pnpm.ps1`. Identificar ese problema como un fallo del entorno antes de atribuirlo a Next.js o a las dependencias. Esta guía no requiere cambiar la política de ejecución.

## Configurar el entorno

Todas las variables son opcionales. Para personalizarlas, copiar [.env.example](../../.env.example) a `.env.local`. En PowerShell, solo si el archivo destino no existe:

```powershell
if (-not (Test-Path -LiteralPath .env.local)) {
    Copy-Item -LiteralPath .env.example -Destination .env.local
}
```

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Host de Ollama para chat y embeddings |
| `OLLAMA_MODEL` | `llama3.2:3b` | Modelo de conversación, previamente descargado |
| `OLLAMA_EMBED_MODEL` | `embeddinggemma` | Modelo de embeddings; cambiar su nombre invalida el índice al refrescarlo |
| `OLLAMA_NUM_CTX` | `8192` | Ventana de contexto solicitada al modelo de chat |

`OLLAMA_NUM_CTX` se interpreta con `parseInt`; si no produce un entero positivo se usa 8192. La temperatura está fijada en `0` en el código y no tiene variable de entorno.

Las variables se consumen en el servidor. `127.0.0.1` se refiere al equipo o contenedor donde corre Next.js, no al navegador. Para reproducir la configuración local, ejecutar Next.js y Ollama en la misma máquina. Si se cambia el host, revisar también dónde se procesarán mensajes y documentos.

Reiniciar Next.js tras cambiar `.env.local`. Si se cambió el modelo de embeddings, el siguiente acceso que refresque el índice volverá a construirlo. Las carpetas del corpus y del índice no son configurables por entorno.

## Ejecutar y comprobar

Para desarrollo:

```sh
pnpm dev
```

Abrir [localhost:3000](http://localhost:3000). Con datos sintéticos:

1. Verificar que la pantalla comienza sin caso activo.
2. Pulsar **Iniciar caso**. Debe aparecer un número y, si la inferencia responde, la pregunta inicial.
3. Enviar un mensaje descriptivo. Este turno ejercita recuperación y chat; la primera indexación puede agregar demora.
4. Comprobar que el chat responde y que un JSON válido actualiza el panel.
5. Visitar **Casos abiertos** para comprobar que se guardó el registro.

Una respuesta del chat por sí sola no prueba que se hayan recuperado fragmentos: puede no haber coincidencias por encima del umbral. Ver [diagnóstico](08-desarrollo-y-diagnostico.md).

Para compilar y ejecutar el servidor de producción local:

```sh
pnpm build
pnpm start
```

El segundo comando requiere una compilación correcta. Esta arquitectura necesita servidor Node y almacenamiento persistente con escritura; la interfaz no basta como exportación estática.

## Archivos generados

| Ruta | Contenido | Conservación |
| --- | --- | --- |
| `.env.local` | Configuración local | No versionada |
| `.data/triage.db` | Casos y mensajes | Datos persistentes; no es una caché |
| `.rag-index/` | Índice vectorial y `knowledge.hash` | Reconstruible desde `knowledge/` y el modelo de embeddings |
| `.rag-index.tmp/` | Construcción temporal del índice | Gestionada por el código de RAG |
| `.next/` | Salida de Next.js | Generada por desarrollo o compilación |

Los modelos los administra Ollama fuera de estas rutas. `.gitignore` excluye los datos y las carpetas generadas; excluye `.env.local` pero permite versionar `.env.example`.

## Referencias

- [Configuración de ejemplo](../../.env.example) y [scripts](../../package.json).
- [ADR 0008: Ollama](../adr/0008-local-ollama-via-llamaindex.md).
- [ADR 0010: SQLite y Node 24](../adr/0010-cases-persisted-in-local-sqlite.md).
- [Diagnóstico de problemas](08-desarrollo-y-diagnostico.md#diagnóstico-por-síntoma).

[Volver al índice general](../README.md)
