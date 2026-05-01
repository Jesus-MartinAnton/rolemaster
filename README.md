# RoleMaster 🎲🧙

**AI-powered TTRPG adventure generator** — habla en lenguaje natural y obtén una aventura de rol interactiva, navegable, lista para jugar.

```
Tú:  "Una aventura de fantasía oscura en un bosque maldito"
RoleMaster:  ▸ Genera aventura con 5 escenas, 3 personajes, decisiones morales
             ▸ Juega desde la terminal: elige, avanza, descubre
             ▸ Guarda, carga, modifica, comparte
```

---

## ¿Qué es RoleMaster?

RoleMaster es un **agente de IA** que convierte lenguaje natural en aventuras de rol estructuradas (estilo Twine). No es un chat — es un **generador + renderizador de historias interactivas**.

### ¿Para quién?

- **Dungeon Masters** que quieren aventuras listas para jugar en minutos
- **Escritores** que necesitan estructurar narrativas ramificadas
- **Cualquiera** que quiera crear y jugar sus propias historias

### ¿Qué lo hace especial?

| Característica | Descripción |
|----------------|-------------|
| **IA local** | Usa Ollama con modelos en tu GPU — sin conexión a internet, sin API keys |
| **Estructura limpia** | Genera JSON validado contra schema — no texto libre |
| **Navegable** | El CLI renderiza la historia interactivamente: escoge, avanza, retrocede |
| **Portátil** | Las aventuras son archivos JSON — compártelas, modifícalas, versionalas |
| **Extensible** | Arquitectura modular: herramientas, renderers, futura GUI web |

---

## Stack técnico

```
┌─────────────────────────────────────────────────────┐
│                     RoleMaster                       │
├─────────────────────────────────────────────────────┤
│  CLI (commander.js)     │  Renderer interactivo      │
├─────────────────────────┴───────────────────────────┤
│  Tools system: generate · validate · storage         │
├─────────────────────────────────────────────────────┤
│  Ollama (GPU local: RTX 5070 Ti · 12GB VRAM)        │
├─────────────────────────────────────────────────────┤
│  TypeScript · Node.js · Next.js (futura GUI)        │
└─────────────────────────────────────────────────────┘
```

- **TypeScript** — Tipado fuerte, código legible y mantenible
- **Node.js** — Ejecución en terminal, listo para web después
- **Ollama** — Modelos de IA locales (Qwen3.5, Llama, Mistral)
- **Commander.js** — CLI profesional con comandos y ayuda
- **AJV** — Validación de JSON contra schema

---

## Arquitectura del agente

RoleMaster usa el patrón **ReAct** (Reasoning + Acting) con validación iterativa:

```
Usuario ──► Agente (orquestador) ──► LLM (Ollama) ──► JSON
              │                                            │
              │    ┌──────────────────────────────────────┐│
              │    │  Validación contra schema (3 retry)  ││
              │    └──────────────────────────────────────┘│
              │                                            │
              ▼                                            ▼
          CLI Renderer                              Archivo JSON
       (historia navegable)                      (aventura guardada)
```

El **orquestador** (código, no IA) decide qué hacer en cada paso. El LLM solo genera contenido creativo. Esto asegura que el resultado siempre sea JSON válido y consistente.

---

## Comandos

```bash
# Generar una aventura desde lenguaje natural
rolemaster generate "Aventura de ciencia ficción en una estación espacial abandonada"

# Jugar una aventura guardada
rolemaster play mi-aventura.json

# Listar aventuras guardadas
rolemaster list

# Cargar una aventura para modificarla
rolemaster load mi-aventura
```

---

## Formato de aventura

Cada aventura es un JSON estructurado:

```json
{
  "meta": {
    "title": "La Estación Fantasma",
    "genre": "science-fiction",
    "tone": "suspense",
    "summary": "Una estación espacial abandonada esconde secretos..."
  },
  "scenes": [
    {
      "id": "start",
      "title": "Llegada",
      "text": "La esclusa se abre con un silbido...",
      "choices": [
        { "text": "Ir al puente de mando", "target": "bridge" },
        { "text": "Explorar los dormitorios", "target": "quarters" }
      ]
    }
  ]
}
```

- Ligero, portable, versionable con Git
- Fácil de validar y transformar (a HTML, PDF, etc.)
- Diseñado para ser generado por IA de forma confiable

---

## Roadmap

| Fase | Estado | Descripción |
|------|--------|-------------|
| **0. Planificación** | ✅ Completado | SDD: especificación, diseño, tareas |
| **1. Infrastructure** | ⬜ Por empezar | TypeScript, estructura, dependencias |
| **2. Types** | ⬜ Por empezar | Interfaces TypeScript |
| **3. Core tools** | ⬜ Por empezar | Generación, validación, almacenamiento |
| **4. CLI** | ⬜ Por empezar | Comandos de terminal |
| **5. Renderer** | ⬜ Por empezar | Historia interactiva navegable |
| **6. Integración** | ⬜ Por empezar | Todo conectado |
| **7. Testing** | ⬜ Por empezar | Tests y pulido |
| **8. GUI Web** | 🔮 Futuro | Interfaz gráfica con Next.js |

---

## Primeros pasos

```bash
# Requisitos
- Node.js 18+
- Ollama instalado con un modelo (ej: qwen3.5:9b-q8_0)
- Git

# Instalación
git clone https://github.com/Jesus-MartinAnton/rolemaster.git
cd rolemaster
npm install

# Uso
npm run generate "Una aventura de fantasía con dragones"
```

---

## Licencia

MIT — haz lo que quieras con esto. Si construyes algo guay, cuéntamelo.

---

## Sobre el autor

Proyecto creado como portfolio de **arquitectura de agentes de IA**, demostrando:

- Diseño y planificación con SDD (Spec-Driven Development)
- Patrón ReAct para orquestación de LLMs
- TypeScript full-stack (CLI → GUI web)
- Integración con modelos locales (Ollama)
- Git workflow profesional con commits semánticos