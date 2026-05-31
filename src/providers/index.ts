/**
 * Provider factory - creates the configured LLM provider.
 * Provider is selected via LLM_PROVIDER environment variable.
 */

import type { LLMProvider } from './interface.js';
import { OllamaProvider } from './ollama.js';
import { OpenAICompatibleProvider } from './openaiCompatible.js';

const provider = process.env.LLM_PROVIDER || 'openai-compatible';

/**
 * Returns the configured LLM provider based on LLM_PROVIDER env var.
 * Default: 'openai-compatible'
 * Options: 'ollama', 'openai-compatible'
 */
export function getProvider(): LLMProvider {
  switch (provider) {
    case 'ollama':
      return new OllamaProvider();
    case 'openai-compatible':
      return new OpenAICompatibleProvider();
    default:
      throw new Error(`Unknown LLM provider: ${provider}. Options: 'ollama', 'openai-compatible'`);
  }
}

/** Returns the name of the currently configured provider */
export function getProviderName(): string {
  return provider;
}