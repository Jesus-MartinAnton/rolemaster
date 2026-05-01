/**
 * JSON Schema for Adventure Validation
 * Used by AJV for validating adventure YAML/JSON files
 */

import type { Schema } from 'ajv';

export const adventureSchema: Schema = {
  type: "object",
  required: ["meta", "scenes"],
  properties: {
    meta: {
      type: "object",
      required: ["title", "genre", "tone"],
      properties: {
        title: { type: "string", minLength: 1 },
        genre: { type: "string", minLength: 1 },
        tone: { type: "string", minLength: 1 },
        summary: { type: "string", default: "" },
        createdAt: { type: "string" },
        version: { type: "string" }
      },
      additionalProperties: false
    },
    scenes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "title", "text", "choices"],
        properties: {
          id: { type: "string", pattern: "^[a-z][a-z0-9_-]*$" },
          title: { type: "string", minLength: 1 },
          text: { type: "string", minLength: 1 },
          choices: {
            type: "array",
            items: {
              type: "object",
              required: ["text", "target"],
              properties: {
                text: { type: "string", minLength: 1 },
                target: { type: "string", pattern: "^[a-z][a-z0-9_-]*$" }
              }
            }
          }
        }
      }
    }
  },
  additionalProperties: false
};