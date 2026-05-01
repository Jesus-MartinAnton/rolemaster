/**
 * Adventure Generation Tool
 * Calls Ollama to generate an adventure from a prompt
 * Phase 3: Core Tools
 */

import type { Adventure, OllamaRequest, OllamaResponse, ValidationResult } from '../types/index.js';
import { validateAdventure } from './validate.js';

const OLLAMA_URL = process.env.OLLAMA__BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b-q8_0';
const MAX_RETRIES = 3;

/**
 * System prompt for the LLM - instructs it to generate adventure JSON
 */
const SYSTEM_PROMPT = `Eres un master de rol experimentado. Genera aventuras de rol interactivas.
Responde SOLO con JSON válido siguiendo este esquema:
{
  "meta": { "title": "...", "genre": "...", "tone": "...", "summary": "..." },
  "scenes": [ { "id": "...", "title": "...", "text": "...", "choices": [...] } ]
}
- genre: fantasy, sci-fi, horror, mystery, romance, adventure
- tone: dark, lighthearted, neutral, comedic, serious
- scene id: minúsculas, guiones. Ejemplo: "start", "entrada-mazmorra"
- Cada escena debe tener 2-4 opciones excepto las escenas finales (sin opciones = final)
- Genera entre 5-10 escenas
- La escena "start" es el inicio obligatorio
- Cada opción debe apuntar a otra escena existente
- El texto debe ser en español
- Genera una historia completa y coherente`;

/**
 * Calls the Ollama API to generate text.
 *
 * @param model - Model name
 * @param prompt - User prompt
 * @returns Generated text response
 */
async function callOllama(model: string, prompt: string): Promise<string> {
  const request: OllamaRequest = {
    model,
    prompt,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 2048
    }
  };

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaResponse;
  return data.response;
}

/**
 * Extracts JSON from the response, handling markdown code blocks.
 *
 * @param response - Raw LLM response
 * @returns Parsed JSON object
 */
function extractJson(response: string): unknown {
  // Check for markdown code blocks
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }

  // Check for plain JSON
  const trimmed = response.trim();
  return JSON.parse(trimmed);
}

/**
 * Generate an adventure from a natural language prompt.
 * Uses the ReAct pattern with 3 retries on validation failure.
 *
 * @param prompt - Natural language description of the adventure
 * @returns Validated Adventure object
 * @throws Error if all retries fail or Ollama is unreachable
 */
export async function generateAdventure(prompt: string): Promise<Adventure> {
  const model = DEFAULT_MODEL;

  // Build user prompt with the user's idea
  let userPrompt = `Genera una aventura de rol con el siguiente concepto: ${prompt}`;

  // Retry loop
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Generating adventure (attempt ${attempt}/${MAX_RETRIES})...`);

      // Call Ollama
      const response = await callOllama(model, `${SYSTEM_PROMPT}\n\n${userPrompt}`);

      // Parse response as JSON
      let parsed: unknown;
      try {
        parsed = extractJson(response);
      } catch (parseErr) {
        console.warn(`Failed to parse JSON on attempt ${attempt}, retrying...`);
        lastError = new Error(`Invalid JSON in response: ${(parseErr as Error).message}`);
        continue;
      }

      // Validate the generated adventure
      const validationResult = validateAdventure(JSON.stringify(parsed));

      if (!validationResult.valid) {
        console.warn(`Validation failed on attempt ${attempt}:`);
        validationResult.errors?.forEach(err => {
          console.warn(`  - ${err.path}: ${err.message}`);
        });

        // Add validation error context to retry prompt
        userPrompt += `\n\nError en validación: ${validationResult.errors?.map(e => e.message).join(', ')}. Corrigiere estos errores.`;
        lastError = new Error(`Validation failed: ${validationResult.errors?.map(e => e.message).join(', ')}`);
        continue;
      }

      // Success - return valid adventure
      console.log('Adventure generated and validated successfully!');
      return parsed as Adventure;

    } catch (err) {
      lastError = err as Error;

      // Check if it's a connection error (don't retry on connection failure)
      if (lastError.message.includes('ECONNREFUSED') || lastError.message.includes('fetch failed')) {
        throw new Error(`Cannot connect to Ollama at ${OLLAMA_URL}. Is Ollama running?`);
      }

      console.warn(`Attempt ${attempt} failed: ${lastError.message}`);
    }
  }

  // All retries exhausted
  throw new Error(`Failed to generate valid adventure after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}

/**
 * Get the current Ollama configuration.
 *
 * @returns Object with URL and model
 */
export function getOllamaConfig(): { url: string; model: string } {
  return {
    url: OLLAMA_URL,
    model: DEFAULT_MODEL
  };
}