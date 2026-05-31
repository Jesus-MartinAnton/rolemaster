/**
 * Ollama provider for local LLM inference.
 * Supports streaming with thinking token handling (Qwen3.x models).
 */

import type { LLMProvider } from './interface.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b-q8_0';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';

  /**
   * Generates a response using Ollama's /api/generate endpoint with streaming.
   * Handles the "thinking" field for Qwen3.x models that include verbose thinking.
   */
  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(600_000),
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: systemPrompt,
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
            // Qwen3.x thinking tokens - include in output
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

  /** Check if Ollama is reachable */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
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
    return { url: OLLAMA_BASE_URL, model: OLLAMA_MODEL };
  }
}