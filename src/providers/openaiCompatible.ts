/**
 * OpenAI-compatible API provider (llama.cpp, ollama with OpenAI compat, etc).
 * Uses the standard /v1/chat/completions endpoint.
 */

import type { LLMProvider } from './interface.js';

const OPENAI_COMPATIBLE_URL = process.env.OPENAI_COMPATIBLE_URL || 'http://localhost:8080';
const OPENAI_COMPATIBLE_MODEL = process.env.OPENAI_COMPATIBLE_MODEL || 'qwen3.6-35b-a3b';
/**
 * NOTA: Este modelo de 35B usa reasoning_content (piensa antes de responder).
 * Con 4096 tokens se queda justo para aventuras de 3+ escenas.
 * 8192 da margen para razonamiento + JSON completo de 5-8 escenas.
 * El timeout de 600s es necesario porque el modelo tarda ~3-4 min en generar.
 */
const MAX_TOKENS = 8192;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = 'openai-compatible';

  /**
   * Generates a response using OpenAI-compatible /v1/chat/completions endpoint.
   */
  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const response = await fetch(`${OPENAI_COMPATIBLE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(600_000),
      body: JSON.stringify({
        model: OPENAI_COMPATIBLE_MODEL,
        messages,
        stream: false,
        max_tokens: MAX_TOKENS
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI-compatible API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices in response');
    }

    const content = data.choices[0]?.message?.content;
    if (content === null || content === undefined) {
      throw new Error('No content in response message');
    }

    return content;
  }

  /** Check if the OpenAI-compatible endpoint is reachable */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${OPENAI_COMPATIBLE_URL}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Returns current config for debugging */
  getConfig(): { url: string; model: string } {
    return { url: OPENAI_COMPATIBLE_URL, model: OPENAI_COMPATIBLE_MODEL };
  }
}