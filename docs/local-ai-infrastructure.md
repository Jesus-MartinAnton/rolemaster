# 🖥️ Infraestructura de IA Local — LLM Inference Optimization

## Overview

Setup de producción para inference local de alto rendimiento en **RTX 5070 Ti**, integrado con RoleMaster como backend de IA local.

## Hardware & Stack

| Componente | Especificación |
|------------|----------------|
| **GPU** | NVIDIA RTX 5070 Ti Laptop (12GB VRAM, Blackwell) |
| **CPU** | AMD Ryzen 9 8940HX (16 cores) |
| **Sistema** | Windows + WSL2 (Ubuntu) |
| **Modelo** | Qwen3.6-35B-A3B MoE — IQ4_XS quantizado |
| **Engine** | llama.cpp (fork TurboQuant Plus) |
| **Velocidad** | **28 tok/s sostenido** a 128K+ contexto |

## Modelo

**Qwen3.6-35B-A3B** (Mixture of Experts, 3B parámetros activos)

- **Cuantización:** IQ4_XS (4-bit + interleaved) — ~18GB en disco
- **Contexto máximo:** 256K+ tokens
- **Descarga:** HuggingFace / repositorio de modelos GGUF

## Inference Engine

**TurboQuant Plus** — fork de llama.cpp con KV cache compression (3.8x)

Repo: [TheTom/llama-cpp-turboquant](https://github.com/TheTom/llama-cpp-turboquant)

### Build desde source

```bash
git clone https://github.com/TheTom/llama-cpp-turboquant.git
cd llama-cpp-turboquant
git checkout feature/turboquant-kv-cache

# Compilar con CUDA (WSL/Linux)
cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES="86;89" -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j 16
```

> **Nota:** La RTX 5070 Ti es Blackwell (compute_120), no soportada por CUDA Toolkit <12.4. Se compila para arquitecturas 86/89 (Ampere/Ada) y funciona por compatibilidad hacia atrás.

## Configuración Optimizada

### Flags documentadas

| Flag | Valor | Propósito |
|------|-------|-----------|
| `--fit on` | ✓ | Fitting dinámico — comprime modelo para VRAM |
| `--fit-ctx 128000` | 128K | Tamaño de contexto para fitting, permite velocidades más estables |
| `--fit-target 256` | 256 MiB | Target de memoria libre |
| `-ctk turbo4` | turbo4 | Key cache: 4-bit PolarQuant (calidad) |
| `-ctv turbo3` | turbo3 | Value cache: 3-bit PolarQuant (compresión) |
| `-b 512` | 512 | Batch size logical |
| `-np 1` | 1 | Slots de inferencia paralela |
| `-fa on` | ✓ | Flash Attention — reduce VRAM |
| `--port 8080` | 8080 | Puerto HTTP |

### Comando completo

```bash
./llama-server \
    -m /home/chus/models/Qwen3.6-35B-A3B-UD-IQ4_XS.gguf \
    --fit on --fit-ctx 128000 --fit-target 256 \
    -np 1 -b 512 -fa on \
    --port 8080 \
    -ctk turbo4 -ctv turbo3
```

### Flags NO recomendadas

| Flag | Razón |
|------|-------|
| `--no-mmap` | Causa deadlock en carga con IQ4_XS |
| `-ctk q8_0 -ctv q8_0` | Más VRAM, no más velocidad |
| `-ngl 99` sin `--fit` | Puede causar memory-bound si no cabe |

## Resultados

| Métrica | Valor | Condiciones |
|---------|-------|-------------|
| **Velocidad sostenida** | 28.5 tok/s | Contexto 128K, se obtienen resultado similares con 256k |
| **Velocidad pico** | 31.12 tok/s | Contexto 128K+ |
| **Prefill speed** | @1000 tok/s | Prompt corto |
| **Uso VRAM** | ~25% baseline | Con fitting activo |
| **Contexto máximo** | 256K+ tokens | Sin OOM, velocidad 25-28 tok/s |

## Decisiones Técnicas

### 1. Cuantización IQ4_XS vs Q8_0

**IQ4_XS** (4-bit interleaved) reduce el modelo de ~35GB a ~18GB, permitiendo correrlo en GPU con margen.

Tradeoff: <2% degradación en benchmarks estándar vs Q8_0.

### 2. TurboQuant Asymmetric (K=turbo4 / V=turbo3)

Descubrimiento clave de TurboQuant Plus research: **V compression es "free"** — comprimir el value cache hasta 2-bit no tiene efecto medible en atención.

Config asymmetric para IQ4_XS weights:
- K en turbo4 → preserva routing de atención
- V en turbo3 → máxima compresión sin degradación

### 3. Fitting Dinámico (--fit)

El fitting permite que el modelo se comprima automáticamente para caber en VRAM. Con `--fit-target 256` se mantiene ~256MB de headroom para KV cache y batches.

### 4. Flash Attention

Reduce uso de VRAM en ~20% para atención sin penalidad de velocidad. Crítico para mantener rendimiento en contextos largos.

## API Integration

El servidor expone **OpenAI-compatible API**:

```bash
curl http://localhost:8080/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "qwen",
        "messages": [{"role": "user", "content": "Una aventura de fantasía oscura"}],
        "temperature": 0.7,
        "max_tokens": 2048
    }'
```

Integración TypeScript:

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
    baseURL: 'http://localhost:8080/v1',
    apiKey: 'not-needed'
});

// Uso estándar OpenAI
const response = await client.chat.completions.create({
    model: 'qwen',
    messages: [{ role: 'user', content: 'Genera una aventura...' }]
});
```

## Monitoreo

```bash
# Estado del server
curl http://localhost:8080/health
curl http://localhost:8080/v1/models

# Uso de GPU en tiempo real
watch -n 1 nvidia-smi

# Métricas detalladas
curl http://localhost:8080/metrics
```

## Setup de Launcher (Opcional)

Para no recordar flags, crear alias o script:

```bash
mkdir -p ~/bin

cat > ~/bin/qwen-turbo << 'EOF'
#!/bin/bash
~/llamaCPP/llama-cpp-turboquant/build/bin/llama-server \
    -m ~/models/Qwen3.6-35B-A3B-UD-IQ4_XS.gguf \
    --fit on --fit-ctx 128000 --fit-target 256 \
    -np 1 -b 512 -fa on \
    --port 8080 \
    -ctk turbo4 -ctv turbo3
EOF

chmod +x ~/bin/qwen-turbo
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Uso: solo escribir "qwen-turbo"
```

## Referencias

- [llama.cpp](https://github.com/ggerganov/llama.cpp)
- [TurboQuant Plus](https://github.com/TheTom/turboquant_plus)
- [TurboQuant Paper (ICLR 2026)](https://arxiv.org/abs/2504.19874)
- [PolarQuant Paper (AISTATS 2026)](https://arxiv.org/abs/2502.02617)
- [Qwen3.6 GGUF Models](https://huggingface.co/models?search=qwen3+gguf)