/**
 * Adventure Generation Tool
 * Uses the configured LLM provider to generate adventures.
 * Supports both Ollama and OpenAI-compatible APIs transparently.
 */

import type { Adventure } from '../types/index.js';
import { validateAdventure } from './validate.js';
import { getProvider } from '../providers/index.js';

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
 * Uses the configured LLM provider with 3 retries.
 */
export async function generateAdventure(prompt: string): Promise<Adventure> {
  const provider = getProvider();
  let userPrompt = `Genera una aventura sobre: ${prompt}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Generating adventure (attempt ${attempt}/${MAX_RETRIES})...`);
      console.log(`Using provider: ${provider.name}`);

      const startTime = Date.now();
      console.log(`  Waiting for response (timeout: 600s)...`);
      const response = await provider.generate(userPrompt, SYSTEM_PROMPT);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Response received in ${elapsed}s: ${response.length} chars`);

      if (!response.trim()) {
        throw new Error('Empty response from provider');
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
        validationResult.errors?.forEach((err) => console.warn(`  - ${err.path}: ${err.message}`));
        userPrompt += `\n\nErrores a corregir: ${validationResult.errors?.map((e) => e.message).join(', ')}`;
        lastError = new Error(`Validation: ${validationResult.errors?.map((e) => e.message).join(', ')}`);
        continue;
      }

      console.log('Adventure generated and validated!');
      return parsed as Adventure;
    } catch (err) {
      lastError = err as Error;
      // FIX: Network errors (ECONNREFUSED, fetch failed, etc.) are now retried
      // instead of aborting immediately. All errors continue the retry loop.
      console.warn(`Attempt ${attempt} failed: ${lastError.message}`);
    }
  }

  throw new Error(
    `Failed after ${MAX_RETRIES} attempts. Provider: ${provider.name}. Last error: ${lastError?.message}`
  );
}