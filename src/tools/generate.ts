/**
 * Adventure Generation Tool
 * Calls Ollama to generate an adventure from a prompt.
 * Uses streaming to handle models with verbose thinking (Qwen3.5).
 */

import type { Adventure } from '../types/index.js';
import { validateAdventure } from './validate.js';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b-q8_0';
const MAX_RETRIES = 3;

const SYSTEM_PROMPT = `Eres un master de rol. Genera aventuras SOLO en formato JSON, sin texto adicional.

Formato EXACTO (copia esta estructura):
{
  "meta": { "title": "Titulo", "genre": "fantasy", "tone": "neutral", "summary": "Resumen" },
  "scenes": [
    {
      "id": "start",
      "title": "Titulo escena",
      "text": "Texto narrativo de la escena...",
      "choices": [
        { "text": "Opción A", "target": "escena2" },
        { "text": "Opción B", "target": "escena3" }
      ]
    }
  ]
}

Reglas IMPORTANTES:
- scene ids: solo minusculas y guiones. Ej: "start", "cueva-oscura"
- La PRIMERA escena SIEMPRE se llama "start"
- Cada escena debe tener 2-3 choices (excepto la final, que tiene 0)
- Todos los choices.target deben apuntar a una scene.id que exista
- Texto narrativo en español
- 5-8 escenas
- No añadas texto antes ni después del JSON`;

/**
 * Calls Ollama using streaming and accumulates the full response.
 * This handles verbose thinking models correctly.
 */
async function callOllama(model: string, system: string, prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      system,
      prompt,
      stream: true,
      options: {
        temperature: 0.7,
        num_predict: 4096
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body from Ollama');
  }

  // Read the stream chunk by chunk
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.response) {
          fullText += data.response;
        } else if (data.thinking) {
          fullText += data.thinking;
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer);
      if (data.response) {
        fullText += data.response;
      } else if (data.thinking) {
        fullText += data.thinking;
      }
    } catch {
      // skip
    }
  }

  return fullText;
}

/**
 * Extracts JSON from a response string, handling various wrappers.
 * Logs the raw text before trying to parse for debugging.
 */
function extractJson(response: string): unknown {
  if (!response || !response.trim()) {
    throw new Error('Empty response from model');
  }

  const cleaned = response.trim();
  console.log(`extractJson: trying to parse ${cleaned.length} chars`);
  console.log(`First 80: ${cleaned.slice(0, 80)}`);

  // Try markdown code blocks
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      console.log('Found markdown JSON block');
      return JSON.parse(jsonMatch[1].trim());
    } catch { /* fall through */ }
  }

  // Find JSON between first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  console.log(`First { at ${firstBrace}, last } at ${lastBrace}`);
  
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
    console.log(`Extracted JSON string (${jsonStr.length} chars)`);
    console.log(`Starts with: ${jsonStr.slice(0, 60)}`);
    console.log(`Ends with: ${jsonStr.slice(-60)}`);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.log(`JSON parse error: ${(e as Error).message}`);
      // Fall through to direct parse
    }
  }

  // Direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Cannot parse as JSON: ${cleaned.slice(0, 300)}...`);
  }
}

/**
 * Generate an adventure from a natural language prompt.
 * Uses ReAct pattern with 3 retries.
 */
export async function generateAdventure(prompt: string): Promise<Adventure> {
  const model = DEFAULT_MODEL;
  let userPrompt = `Genera una aventura sobre: ${prompt}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Generating adventure (attempt ${attempt}/${MAX_RETRIES})...`);

      const response = await callOllama(model, SYSTEM_PROMPT, userPrompt);
      console.log(`Got response: ${response.length} chars`);

      if (!response.trim()) {
        throw new Error('Empty response from Ollama');
      }

      let parsed: unknown;
      try {
        parsed = extractJson(response);
      } catch (parseErr) {
        console.warn(`Parse failed on attempt ${attempt}`);
        console.warn(`First 150 chars: ${response.slice(0, 150)}`);
        lastError = new Error(`Invalid JSON: ${(parseErr as Error).message}`);
        continue;
      }

      const validationResult = validateAdventure(JSON.stringify(parsed));

      if (!validationResult.valid) {
        console.warn(`Validation failed on attempt ${attempt}:`);
        validationResult.errors?.forEach(err => console.warn(`  - ${err.path}: ${err.message}`));
        userPrompt += `\n\nErrores a corregir: ${validationResult.errors?.map(e => e.message).join(', ')}`;
        lastError = new Error(`Validation: ${validationResult.errors?.map(e => e.message).join(', ')}`);
        continue;
      }

      console.log('✅ Adventure generated and validated!');
      return parsed as Adventure;

    } catch (err) {
      lastError = err as Error;

      if (lastError.message.includes('ECONNREFUSED') || lastError.message.includes('fetch failed')) {
        throw new Error(`Cannot connect to Ollama at ${OLLAMA_URL}. Is it running?`);
      }

      console.warn(`Attempt ${attempt} failed: ${lastError.message}`);
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} attempts. Last: ${lastError?.message}`);
}

export function getOllamaConfig(): { url: string; model: string } {
  return { url: OLLAMA_URL, model: DEFAULT_MODEL };
}