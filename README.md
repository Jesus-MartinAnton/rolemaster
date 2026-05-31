# RoleMaster 🎲🧙

**AI-powered TTRPG adventure generator** — describe una aventura en lenguaje natural y obtén una historia interactiva lista para jugar en tu terminal.

```
$ rolemaster generate "Un viaje espacial con extraterrestres"

  🎲 RoleMaster — AI-powered adventure generator

  Concept: "Un viaje espacial con extraterrestres"

  ✓ Generated in 186.2s
  ✓ Ecos del Más Allá
    Un viaje espacial donde debes dirigir el primer contacto con una civilización alienígena...
    Genre: scifi  Tone: neutral  Scenes: 8
    Saved as: ecos-del-más-allá-mpu3gwnb

  Play now? (y/N): y

  ━━━ EL ENCUENTRO ━━━

  La nave se detiene frente a una inmensa estructura metálica...

  1. Intentar comunicarse por radio
  2. Preparar una expedición
```

---

## Features

| Característica | Detalle |
|---|---|
| **Generación con IA** | Dos providers: llama.cpp (OpenAI-compatible) u Ollama |
| **Validación robusta** | JSON Schema + validación semántica con hasta 3 reintentos |
| **Navegación interactiva** | Elige, avanza, retrocede — estilo Twine en terminal |
| **Auto-save** | Las aventuras se guardan automáticamente al generarse |
| **Portátil** | Archivos JSON ligeros, versionables con Git |
| **Tests** | 14 tests unitarios con Vitest |

---

## Stack técnico

```
┌─────────────────────────────────────────────────────┐
│                  RoleMaster CLI                       │
├─────────────────────────────────────────────────────┤
│  Commander.js     │  Renderer interactivo             │
├───────────────────┴─────────────────────────────────┤
│  Tools: generate · validate · storage                │
├─────────────────────────────────────────────────────┤
│  Providers: OpenAI-compatible · Ollama               │
├─────────────────────────────────────────────────────┤
│  TypeScript · Node.js · Vitest · AJV                 │
└─────────────────────────────────────────────────────┘
```

- **TypeScript** estricto — tipado fuerte sin `any` aislados
- **Node.js 18+** — ESM modules, `fetch` nativo, `AbortSignal.timeout`
- **Commander.js** — CLI profesional con subcomandos
- **AJV** — Validación JSON Schema con errores descriptivos
- **Vitest** — Tests unitarios con mocking de providers
- **Arquitectura modular** — Providers con factory pattern, tools desacopladas

---

## Cómo funciona

```
Usuario ──► CLI ──► Provider (LLM) ──► JSON ──► Validación (AJV + semántica)
               │                                              │
               │    ┌──────────────────────────────────────┐   │
               │    │  ¿Válido?  ◄── No ──► Reintento (x3) │   │
               │    └──────────────────────────────────────┘   │
               ▼                                               ▼
           Renderer                                      Archivo JSON
      (historia navegable)                          (guardado automático)
```

El **orquestador** (código TypeScript, no IA) gestiona el flujo completo. El LLM solo genera contenido creativo. Esto garantiza que el resultado siempre sea JSON válido y estructurado.

### Robustez incorporada

- **Timeouts**: 600s por llamada al modelo (modelos grandes como Qwen 35B tardan ~3-4 min)
- **Reintentos**: 3 intentos con retroalimentación al modelo sobre errores de validación
- **Auto-recuperación**: Errores de red no abortan — reintentan automáticamente
- **Validación dual**: JSON Schema (AJV) + reglas semánticas (escenas únicas, targets válidos)
- **Runtime safety**: Validación de estructura al cargar archivos guardados

---

## Comandos

```bash
# Generar una aventura (se guarda automáticamente)
rolemaster generate "Aventura de fantasía en un bosque encantado"

# Jugar una aventura guardada
rolemaster play ecos-del-más-allá-mpu3gwnb

# Listar aventuras guardadas
rolemaster list
```

### Salida de ejemplo

```bash
$ rolemaster list

  Saved Adventures  (3)

  ecos-del-más-allá-mpu3gwnb    Ecos del Más Allá                        scifi      2026-05-31
  el-bosque-de-susurros-lx5k2m  El Bosque de Susurros                    fantasy    2026-05-31
  la-torre-maldita-ldh3k2m9p    La Torre Maldita                         fantasy    2026-05-30

  Tip: rolemaster play <id> to play an adventure
```

---

## Configuración

### Proveedores compatibles

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `LLM_PROVIDER` | `openai-compatible` | `ollama` o `openai-compatible` |
| `OPENAI_COMPATIBLE_URL` | `http://localhost:8080` | URL del servidor llama.cpp |
| `OPENAI_COMPATIBLE_MODEL` | `qwen3.6-35b-a3b` | Modelo para OpenAI-compatible |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL del servidor Ollama |
| `OLLAMA_MODEL` | `qwen3.5:9b-q8_0` | Modelo para Ollama |

### Ejemplo `.env`

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:9b-q8_0
```

---

## Formato de aventura

Cada aventura es un JSON validado contra schema:

```json
{
  "meta": {
    "title": "Ecos del Más Allá",
    "genre": "scifi",
    "tone": "neutral",
    "summary": "Un viaje espacial donde debes dirigir el primer contacto..."
  },
  "scenes": [
    {
      "id": "start",
      "title": "El Encuentro",
      "text": "La nave se detiene frente a una inmensa estructura metálica...",
      "choices": [
        { "text": "Intentar comunicarse por radio", "target": "comms" },
        { "text": "Preparar una expedición", "target": "expedicion" }
      ]
    }
  ]
}
```

- Ligero, portable, versionable con Git
- Fácil de validar y transformar (a HTML, PDF, etc.)
- Diseñado para ser generado por IA de forma confiable

---

## Tests

```bash
npm test            # Ejecutar tests (Vitest)
npm run test:watch  # Modo watch durante desarrollo
```

14 tests unitarios en 4 suites:

| Suite | Tests | Cobertura |
|---|---|---|
| `validate.test.ts` | 5 | Validación JSON Schema, semántica, bordes |
| `storage.test.ts` | 4 | Save/load, archivos corruptos, listado, directorio vacío |
| `generate.test.ts` | 3 | Reintentos en error de red, validación, max retries |
| `providers/index.test.ts` | 2 | Factory pattern, selección de provider |

---

## Arquitectura del proyecto

```
src/
├── cli/index.ts           # Entry point (Commander.js)
├── providers/
│   ├── interface.ts       # Contrato LLMProvider
│   ├── ollama.ts          # Provider Ollama (streaming)
│   ├── openaiCompatible.ts# Provider OpenAI-compatible
│   └── index.ts           # Factory pattern
├── tools/
│   ├── generate.ts        # Generación con retry + validación
│   ├── validate.ts        # JSON Schema + validación semántica
│   ├── schema.ts          # Schema AJV
│   └── storage.ts         # File system persistence
├── renderer/index.ts      # Interactive adventure player
└── types/
    ├── adventure.ts       # Interfaces del dominio
    └── index.ts           # Barrel export
```

### Principios aplicados

- **Separación de concerns**: CLI / Providers / Tools / Renderer
- **Factory pattern**: Selección de provider por variable de entorno
- **Programación por contrato**: Interfaz `LLMProvider` común
- **Validación en fronteras**: Schema + semántica antes de persistir
- **Error handling consistente**: Catch global en CLI, errores descriptivos

---

## Requisitos

- **Node.js 18+** (por `AbortSignal.timeout` y `fetch` nativo)
- Un servidor LLM en ejecución:
  - **llama.cpp** en `localhost:8080` (por defecto)
  - **Ollama** en `localhost:11434` (cambiando `LLM_PROVIDER`)

```bash
git clone https://github.com/Jesus-MartinAnton/rolemaster.git
cd rolemaster
npm install
npx tsx src/cli/index.ts generate "Una aventura medieval"
```

---

## Roadmap

| Fase | Estado |
|---|---|
| Planificación y diseño (SDD) | ✅ Completado |
| Core engine (generación, validación, almacenamiento) | ✅ Completado |
| CLI con comandos | ✅ Completado |
| Renderer interactivo | ✅ Completado |
| Proveedores duales (Ollama + OpenAI-compatible) | ✅ Completado |
| Testing y robustez | ✅ Completado |
| Interfaz gráfica (Next.js) | 🔮 Futuro |

---

## Licencia

MIT — haz lo que quieras con esto. Si construyes algo guay, cuéntamelo.

---

## Portfolio

Este proyecto demuestra:

- **Arquitectura limpia**: Separación en capas, patrones de diseño, código mantenible
- **TypeScript avanzado**: Tipado fuerte, interfaces, módulos ESM
- **Robustez**: Retry logic, timeouts, validación dual, manejo de errores
- **Testing**: Tests unitarios con mocking de dependencias externas
- **Integración con IA**: Providers intercambiables, streaming, validación de salida
- **DevOps**: Conventional commits, spec-driven development, CI-ready
