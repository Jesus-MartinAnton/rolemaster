import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('getProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.LLM_PROVIDER;
  });

  it('should return OpenAI-compatible provider by default', async () => {
    const { getProvider } = await import('./index.js');
    const p = getProvider();
    expect(p.name).toBe('openai-compatible');
  });

  it('should return Ollama provider when configured', async () => {
    process.env.LLM_PROVIDER = 'ollama';
    const { getProvider } = await import('./index.js');
    const p = getProvider();
    expect(p.name).toBe('ollama');
  });
});
