import { describe, it, expect } from 'vitest';
import { validateAdventure } from './validate.js';

function makeAdventure(overrides: Record<string, unknown> = {}) {
  return {
    meta: { title: 'Test Adventure', genre: 'fantasy', tone: 'dark', summary: 'A test' },
    scenes: [
      { id: 'start', title: 'Start', text: 'Beginning', choices: [{ text: 'Go', target: 'end' }] },
      { id: 'end', title: 'End', text: 'The end', choices: [] }
    ],
    ...overrides
  };
}

describe('validateAdventure', () => {
  it('should validate correct adventure', () => {
    const adventure = makeAdventure();
    const result = validateAdventure(JSON.stringify(adventure));
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject adventure without start scene', () => {
    const adventure = makeAdventure({
      scenes: [
        { id: 'middle', title: 'Middle', text: 'In the middle', choices: [] }
      ]
    });
    const result = validateAdventure(JSON.stringify(adventure));
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.message.includes('start'))).toBe(true);
  });

  it('should reject adventure with duplicate scene IDs', () => {
    const adventure = makeAdventure({
      scenes: [
        { id: 'start', title: 'Start', text: 'Beginning', choices: [{ text: 'Go', target: 'start' }] },
        { id: 'start', title: 'Start Again', text: 'Duplicate', choices: [] }
      ]
    });
    const result = validateAdventure(JSON.stringify(adventure));
    expect(result.valid).toBe(false);
    expect(result.errors!.some(e => e.message.includes('Duplicate'))).toBe(true);
  });

  it('should reject adventure with invalid choice targets', () => {
    const adventure = makeAdventure({
      scenes: [
        { id: 'start', title: 'Start', text: 'Beginning', choices: [{ text: 'Go', target: 'nonexistent' }] }
      ]
    });
    const result = validateAdventure(JSON.stringify(adventure));
    expect(result.valid).toBe(false);
    expect(result.errors!.some(e => e.message.includes('nonexistent'))).toBe(true);
  });

  it('should reject invalid JSON syntax', () => {
    const result = validateAdventure('{ invalid json }}}');
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/Invalid JSON/);
  });
});
