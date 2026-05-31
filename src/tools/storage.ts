/**
 * Storage Tool for Adventures
 * Saves, loads, and lists adventures from disk
 * Phase 3: Core Tools
 */

import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { Adventure, AdventureListItem } from '../types/index.js';

const ADVENTURES_DIR = join(homedir(), '.rolemaster', 'adventures');

/**
 * Ensures the adventures directory exists
 */
async function ensureDirectory(): Promise<void> {
  try {
    await mkdir(ADVENTURES_DIR, { recursive: true });
  } catch (err) {
    // Directory already exists
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }
}

/**
 * Generate a URL-safe slug from a title.
 * e.g., "La Torre Maldita" → "la-torre-maldita-{timestamp}"
 *
 * @param title - The adventure title
 * @param timestamp - Current timestamp for uniqueness
 * @returns Slugified string
 */
export function slugify(title: string, timestamp: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);

  return `${base}-${timestamp.toString(36)}`;
}

/**
 * Get the file path for an adventure ID.
 *
 * @param id - Adventure ID
 * @returns Full file path
 */
export function getAdventurePath(id: string): string {
  return join(ADVENTURES_DIR, `${id}.json`);
}

/**
 * Save an adventure to disk.
 * - Creates ~/.rolemaster/adventures/ if it doesn't exist
 * - File name: {id}.json (generate a simple slug from title)
 * - Adds id to the adventure JSON
 *
 * @param adventure - The adventure object to save
 * @returns The generated ID
 */
export async function saveAdventure(adventure: Adventure): Promise<string> {
  await ensureDirectory();

  // Generate ID from title with timestamp for uniqueness
  const timestamp = Date.now();
  const id = slugify(adventure.meta.title, timestamp);

  // Add metadata to the adventure
  const adventureToSave: Adventure = {
    ...adventure,
    meta: {
      ...adventure.meta,
      createdAt: new Date().toISOString()
    }
  };

  const filePath = getAdventurePath(id);
  await writeFile(filePath, JSON.stringify(adventureToSave, null, 2), 'utf-8');

  return id;
}

/**
 * Load an adventure by ID.
 *
 * @param id - The adventure ID to load
 * @returns The Adventure object
 * @throws Error if adventure not found
 */
export async function loadAdventure(id: string): Promise<Adventure> {
  const filePath = getAdventurePath(id);

  try {
    const content = await readFile(filePath, 'utf-8');
    const adventure = JSON.parse(content) as Record<string, unknown>;

    // FIX: Runtime validation — corrupted files would crash downstream
    if (!adventure.meta || typeof adventure.meta !== 'object') {
      throw new Error(`Invalid adventure file: ${id} - missing or invalid "meta" field`);
    }
    if (!Array.isArray(adventure.scenes)) {
      throw new Error(`Invalid adventure file: ${id} - missing or invalid "scenes" field`);
    }
    if (adventure.scenes.length === 0) {
      throw new Error(`Invalid adventure file: ${id} - "scenes" array is empty`);
    }

    return adventure as unknown as Adventure;
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      throw new Error(`Adventure not found: ${id}`);
    }
    throw err;
  }
}

/**
 * List all saved adventures (just metadata, not full content).
 *
 * @returns Array of AdventureListItem
 */
export async function listAdventures(): Promise<AdventureListItem[]> {
  await ensureDirectory();

  const files = await readdir(ADVENTURES_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const adventures: AdventureListItem[] = [];

  for (const fileName of jsonFiles) {
    try {
      const filePath = join(ADVENTURES_DIR, fileName);
      const content = await readFile(filePath, 'utf-8');
      const adventure = JSON.parse(content) as Adventure;

      adventures.push({
        id: fileName.replace('.json', ''),
        title: adventure.meta.title,
        genre: adventure.meta.genre,
        createdAt: adventure.meta.createdAt || new Date().toISOString(),
        filePath
      });
    } catch (err) {
      // Skip invalid files
      console.warn(`Skipping invalid adventure file: ${fileName}`);
    }
  }

  // Sort by creation date, newest first
  adventures.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return adventures;
}

/**
 * Delete an adventure by ID.
 *
 * @param id - The adventure ID to delete
 * @returns True if deleted, false if not found
 */
export async function deleteAdventure(id: string): Promise<boolean> {
  const filePath = getAdventurePath(id);

  try {
    await stat(filePath);
    const { unlink } = await import('fs/promises');
    await unlink(filePath);
    return true;
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

export { ADVENTURES_DIR };