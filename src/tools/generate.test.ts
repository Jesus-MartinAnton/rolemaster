import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Adventure } from '../types/index.js';
import type { LLMProvider } from '../providers/interface.js';

vi.mock('../providers/index.js', () => ({
  getProvider: vi.fn()
}));

vi.mock('./validate.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./validate.js')>();
  return {
    ...original,
    validateAdventure: vi.fn()
  };
});

import { generateAdventure } from './generate.js';
import { getProvider } from '../providers/index.js';
import { validateAdventure } from './validate.js';

const validAdventure: Adventure = {
  meta: { title: 'Test Adventure', genre: 'fantasy', tone: 'dark', summary: 'A test adventure' },
  scenes: [
    { id: 'start', title: 'Start', text: 'You begin your journey.', choices: [{ text: 'Go forward', target: 'end' }] },
    { id: 'end', title: 'End', text: 'The adventure ends.', choices: [] }
  ]
};

function makeMockProvider(generateFn: LLMProvider['generate']): LLMProvider {
  return {
    name: 'test-provider',
    generate: generateFn,
    healthCheck: vi.fn().mockResolvedValue(true)
  };
}

describe('generateAdventure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retry on network errors instead of aborting immediately', async () => {
    const mockGenerate = vi.fn()
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:11434'))
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:11434'))
      .mockResolvedValueOnce(JSON.stringify(validAdventure));

    (getProvider as ReturnType<typeof vi.fn>).mockReturnValue(makeMockProvider(mockGenerate));
    (validateAdventure as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });

    const result = await generateAdventure('test prompt');

    expect(mockGenerate).toHaveBeenCalledTimes(3);
    expect(result).toEqual(validAdventure);
  });

  it('should throw after max retries exhausted', async () => {
    const mockGenerate = vi.fn()
      .mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434'));

    (getProvider as ReturnType<typeof vi.fn>).mockReturnValue(makeMockProvider(mockGenerate));
    (validateAdventure as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true });

    await expect(generateAdventure('test prompt')).rejects.toThrow();
    expect(mockGenerate).toHaveBeenCalledTimes(3);
  });

  it('should retry when validation fails', async () => {
    const invalidAdventure = { meta: { title: '' }, scenes: [] };

    const mockGenerate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(invalidAdventure))
      .mockResolvedValueOnce(JSON.stringify(validAdventure));

    (getProvider as ReturnType<typeof vi.fn>).mockReturnValue(makeMockProvider(mockGenerate));
    (validateAdventure as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ valid: false, errors: [{ path: 'meta.title', message: 'must not be empty' }] })
      .mockReturnValueOnce({ valid: true });

    const result = await generateAdventure('test prompt');

    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(result).toEqual(validAdventure);
  });
});
