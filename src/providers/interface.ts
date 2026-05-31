/**
 * Abstract interface for all LLM providers.
 * All providers must implement these methods.
 */
export interface LLMProvider {
  /** Human-readable provider name */
  name: string;

  /**
   * Generate a response from the LLM.
   * @param prompt - The user prompt
   * @param systemPrompt - The system prompt/instructions
   * @returns The raw text response from the model
   */
  generate(prompt: string, systemPrompt: string): Promise<string>;

  /**
   * Check if the provider is reachable and healthy.
   * @returns true if the provider is healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;
}