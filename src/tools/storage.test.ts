import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';

let testDir = '';

vi.mock('os', () => ({
  homedir: () => testDir
}));

describe('storage', () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join('/tmp', 'rolemaster-test-'));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const sampleAdventure = {
    meta: { title: 'Test Adventure', genre: 'fantasy', tone: 'dark', summary: 'A test' },
    scenes: [
      { id: 'start', title: 'Start', text: 'Beginning', choices: [{ text: 'Go', target: 'end' }] },
      { id: 'end', title: 'End', text: 'The end', choices: [] }
    ]
  };

  it('should save and load adventure', async () => {
    const { saveAdventure, loadAdventure, getAdventurePath } = await import('./storage.js');

    const id = await saveAdventure(sampleAdventure as never);

    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');

    const filePath = getAdventurePath(id);
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.meta.title).toBe('Test Adventure');
    expect(parsed.scenes).toHaveLength(2);

    const loaded = await loadAdventure(id);
    expect(loaded.meta.title).toBe('Test Adventure');
    expect(loaded.scenes).toHaveLength(2);
  });

  it('should throw on invalid adventure file', async () => {
    const { loadAdventure, getAdventurePath } = await import('./storage.js');

    const id = 'corrupted-file';
    const filePath = getAdventurePath(id);
    const dir = join(filePath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify({ meta: {}, scenes: [] }), 'utf-8');

    await expect(loadAdventure(id)).rejects.toThrow();
  });

  it('should list adventures sorted by date', async () => {
    const { getAdventurePath, listAdventures } = await import('./storage.js');

    const adventures = [
      { title: 'First', createdAt: '2024-01-01T00:00:00Z' },
      { title: 'Second', createdAt: '2024-06-01T00:00:00Z' },
      { title: 'Third', createdAt: '2024-03-01T00:00:00Z' }
    ];

    const dir = join(testDir, '.rolemaster', 'adventures');
    await mkdir(dir, { recursive: true });

    for (const adv of adventures) {
      const adventure = {
        meta: { title: adv.title, genre: 'fantasy', tone: 'dark', summary: 'A test', createdAt: adv.createdAt },
        scenes: [{ id: 'start', title: 'Start', text: 'Beginning', choices: [] }]
      };
      const filePath = join(dir, `${adv.title.toLowerCase()}.json`);
      await writeFile(filePath, JSON.stringify(adventure), 'utf-8');
    }

    const list = await listAdventures();

    expect(list).toHaveLength(3);
    expect(list[0].title).toBe('Second');
    expect(list[1].title).toBe('Third');
    expect(list[2].title).toBe('First');
  });

  it('should handle empty adventures directory', async () => {
    const { listAdventures } = await import('./storage.js');

    const list = await listAdventures();

    expect(list).toEqual([]);
  });

  it('should delete an existing adventure', async () => {
    const { saveAdventure, deleteAdventure, loadAdventure, getAdventurePath } = await import('./storage.js');

    const id = await saveAdventure(sampleAdventure as never);
    const deleted = await deleteAdventure(id);

    expect(deleted).toBe(true);

    await expect(loadAdventure(id)).rejects.toThrow();
  });

  it('should return false when deleting non-existent adventure', async () => {
    const { deleteAdventure } = await import('./storage.js');

    const deleted = await deleteAdventure('does-not-exist');

    expect(deleted).toBe(false);
  });
});
