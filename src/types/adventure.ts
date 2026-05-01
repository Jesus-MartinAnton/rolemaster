/**
 * RoleMaster TypeScript Interfaces
 * Phase 2: Type definitions for the adventure system
 */

// ============================================
// Core Adventure Types
// ============================================

export interface Adventure {
  meta: AdventureMeta;
  scenes: Scene[];
}

export interface AdventureMeta {
  title: string;
  genre: string; // e.g., "fantasy", "sci-fi", "horror"
  tone: string; // e.g., "dark", "lighthearted", "neutral"
  summary: string;
  createdAt?: string; // ISO date string, optional
  version?: string; // e.g., "1.0.0", optional
}

// ============================================
// Scene Types
// ============================================

export interface Scene {
  id: string; // unique identifier, required, "start" is special
  title: string;
  text: string; // narrative text
  choices: Choice[]; // can be empty for ending scenes
}

export interface Choice {
  text: string; // what the player reads: "Entrar por la puerta"
  target: string; // scene id to navigate to: "atrio"
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string; // e.g., "scenes[0].title"
  message: string; // e.g., "required field missing"
}

// ============================================
// Storage/Listing Types
// ============================================

export interface AdventureListItem {
  id: string; // UUID or slug
  title: string;
  genre: string;
  createdAt: string;
  filePath: string;
}

// ============================================
// Ollama API Types
// ============================================

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: OllamaOptions;
}

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
}

export interface OllamaResponse {
  response: string;
  done: boolean;
}

// ============================================
// Agent Types
// ============================================

export interface AgentContext {
  prompt: string;
  adventure?: Adventure;
  validation: ValidationResult;
  retries: number;
}