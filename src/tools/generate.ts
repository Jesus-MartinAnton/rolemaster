/**
 * Adventure Generation Tool
 * Uses the configured LLM provider to generate adventures.
 * Supports both Ollama and OpenAI-compatible APIs transparently.
 */

import type { Adventure } from '../types/index.js';
import { validateAdventure } from './validate.js';
import { getProvider } from '../providers/index.js';
import pc from 'picocolors';

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
 * Extracts JSON from a response string, handling various wrappers.
 * Tries multiple extraction strategies:
 * 1. Markdown code blocks (```json ... ```)
 * 2. First { to last } range
 * 3. Direct parse
 */
function extractJson(response: string): unknown {
  if (!response || !response.trim()) {
    throw new Error('Empty response from model');
  }

  const cleaned = response.trim();

  // Strategy 1: Markdown code blocks
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch { /* fall through */ }
  }

  // Strategy 2: Find JSON between first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch { /* fall through */ }
  }

  // Strategy 3: Direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse model response as JSON');
  }
}

/**
 * Generate an adventure from a natural language prompt.
 * Uses the configured LLM provider with 3 retries.
 */
export async function generateAdventure(prompt: string): Promise<Adventure> {
  const provider = getProvider();
  let userPrompt = `Genera una aventura sobre: ${prompt}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now();
      const response = await provider.generate(userPrompt, SYSTEM_PROMPT);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!response.trim()) {
        throw new Error('Empty response from provider');
      }

      let parsed: unknown;
      try {
        parsed = extractJson(response);
      } catch (parseErr) {
        console.warn(`\n  ⚠ Retrying: invalid JSON from model (${(parseErr as Error).message})\n`);
        lastError = new Error(`Invalid JSON: ${(parseErr as Error).message}`);
        continue;
      }

      const validationResult = validateAdventure(JSON.stringify(parsed));

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors?.map((e) => e.message).join('; ');
        console.warn(`\n  ⚠ Retrying: validation failed (${errorMessages})\n`);
        userPrompt += `\n\nErrores a corregir: ${errorMessages}`;
        lastError = new Error(`Validation: ${errorMessages}`);
        continue;
      }

      console.log(`  ${pc.green('✓')} Generated in ${elapsed}s${attempt > 1 ? ` (${attempt} attempt(s))` : ''}`);
      return parsed as Adventure;
    } catch (err) {
      lastError = err as Error;
      console.warn(`\n  ⚠ Retrying: ${lastError.message}\n`);
    }
  }

  throw new Error(`Failed to generate adventure (${MAX_RETRIES} attempts). Check that your LLM provider is running.`);
}