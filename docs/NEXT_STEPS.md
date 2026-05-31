# Next Steps — RoleMaster

> Documento de continuidad. Creado el 2026-05-31 para facilitar retomar el proyecto.

---

## Estado actual del proyecto

RoleMaster funciona correctamente. Puedes probarlo con:

```bash
npx tsx src/cli/index.ts generate "Una aventura de fantasía"
```

**Commits recientes** (los 3 más nuevos):

```
9ef16bd docs: README actualizado con estado real del proyecto y arquitectura
93fee24 feat: UX profesional y guardado automatico
3ff6907 feat: estabilidad, testing y configuracion robusta de providers
```

**Tests**: 14/14 pasando (4 suites: validate, storage, generate, providers)

---

## Pendiente inmediato

### 1. Push a GitHub

```bash
git push origin main
```

Necesita autenticación de GitHub configurada (SSH o token).

### 2. Arreglar `rolemaster: command not found`

El usuario no puede ejecutar `rolemaster` directamente desde la terminal.

**Plan de implementación**:

1. Añadir shebang al entry point:
   ```bash
   # Añadir como PRIMERA línea en src/cli/index.ts
   #!/usr/bin/env node
   ```

2. Añadir `bin` en `package.json`:
   ```json
   "bin": {
     "rolemaster": "dist/cli/index.js"
   }
   ```

3. Build y link:
   ```bash
   npm run build
   npm link
   ```

4. Ahora funcionará globalmente:
   ```bash
   rolemaster generate "Aventura de ciencia ficción"
   ```

**Nota**: Recordar que `dist/` está en `.gitignore`. El usuario que clone necesitará `npm install && npm run build` antes de `npm link`.

---

## Siguientes pasos (priorizados)

### Opción A: UI en terminal (Opción B del plan)

Mejorar la experiencia visual del jugador de aventuras.

**Dependencia**: `inquirer` (ligero, ~200KB)

**Qué cambiar**:

- Reemplazar readline por `inquirer` en `cli/index.ts` y `renderer/index.ts`
- Añadir box-drawing con bordes para escenas (`┌─ ... └─`)
- Radio buttons navegables con flechas para elegir opciones
- Mejorar el display de "choices" en `renderer/index.ts`

**Ejemplo de cómo quedaría**:

```
┌─────────────────────────────────────────────┐
│  EL ENCUENTRO                                │
├─────────────────────────────────────────────┤
│  La nave se detiene frente a una inmensa    │
│  estructura metálica. Luces parpadean...    │
├─────────────────────────────────────────────┤
│  ❯ 1. Intentar comunicarse por radio       │
│    2. Preparar una expedición               │
│    3. Volver a la nave                      │
└─────────────────────────────────────────────┘
[q] Salir  [b] Atrás
```

**Archivos a modificar**:
- `src/cli/index.ts` — prompts con inquirer
- `src/renderer/index.ts` — display de escenas + choices con inquirer
- `package.json` — añadir dependencia `inquirer`

---

### Opción B: Pulido final (fácil, rápido)

Cosas menores que mejoran la calidad del código.

**B.1 — Eliminar `fs-extra` de dependencias**
- Está en `package.json` pero nunca se importa
- `npm uninstall fs-extra @types/fs-extra`
- Impacto: limpieza de dependencias

**B.2 — Ancho de terminal dinámico**
- `renderer/index.ts` hardcodea 78 columnas en `wrapText`
- Cambiar a: `const width = (process.stdout.columns || 80) - 4`
- Impacto: se adapta a cualquier terminal

**B.3 — Comando `delete <id>`**
- La función `deleteAdventure` ya existe en `storage.ts`
- Solo falta añadir el comando en `cli/index.ts`
- Impacto: funcionalidad completa de CRUD

**B.4 — Comando `info`**
- Mostrar configuración activa: provider, URL, modelo
- Útil para debugging rápido
- Impacto: UX

---

### Opción C: Features nuevas

Ideas más ambiciosas para cuando se quiera ampliar.

- **Exportar a HTML** — convertir aventura JSON a página web navegable
- **Comando `load <file>`** — cargar JSON desde cualquier ruta, no solo del directorio de guardado
- **Aventuras con imágenes** — añadir campo `image` a escenas para GUI futura
- **Historial de juego** — registrar decisiones del jugador para estadísticas
- **Modo `--no-save`** — explícitamente NO guardar (ahora siempre guarda)

---

## Contexto técnico para retomar

### Proveedor actual (OpenAI-compatible)

El default es `openai-compatible` apuntando a `localhost:8080` con el modelo `qwen3.6-35b-a3b` (Qwen3.6-35B-A3B-UD-IQ4_XS.gguf).

**Características importantes del modelo**:
- Usa `reasoning_content` — consume ~60% de tokens antes de producir JSON
- Tiempo de generación: ~180-220s para aventura de 6-8 escenas
- `max_tokens` configurado a 8192 (suficiente para reasoning + JSON completo)
- `timeout` configurado a 600s (10 min)

### Ollama

También soportado. Configurar con `LLM_PROVIDER=ollama` en `.env` o como variable de entorno.

### Estructura de archivos importante

```
src/
├── cli/index.ts           ← Entry point, comandos
├── providers/
│   ├── interface.ts       ← LLMProvider interface
│   ├── ollama.ts          ← Ollama streaming
│   ├── openaiCompatible.ts← OpenAI-compatible (timeout 600s, max_tokens 8192)
│   └── index.ts           ← Factory pattern
├── tools/
│   ├── generate.ts        ← Generación con retry + validación
│   ├── validate.ts        ← JSON Schema + semántica
│   ├── schema.ts          ← AJV schema
│   └── storage.ts         ← File system persistence
├── renderer/index.ts      ← Adventure player interactivo
└── types/
    └── adventure.ts       ← Interfaces TypeScript
```

### Configuración de entorno

```env
# En .env
LLM_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_URL=http://localhost:8080
OPENAI_COMPATIBLE_MODEL=qwen3.6-35b-a3b
```

### Tests

```bash
npm test            # Ejecutar (14 tests, ~1s)
npm run test:watch  # Modo watch durante desarrollo
```

---

## Comandos útiles de recordatorio

```bash
# Desarrollo
npm run dev generate "Una aventura de ciencia ficción"

# Generar (sin dev watch)
npx tsx src/cli/index.ts generate "Una aventura de fantasía"

# Jugar
npx tsx src/cli/index.ts play <id>

# Listar
npx tsx src/cli/index.ts list

# Tests
npm test

# Build
npm run build

# Instalar globalmente (después de build)
npm link
rolemaster generate "..."
```
