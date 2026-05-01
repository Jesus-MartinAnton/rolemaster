/**
 * Adventure Validation Tool
 * Validates JSON against the adventure JSON Schema
 * Phase 3: Core Tools
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { adventureSchema } from './schema.js';
import type { ValidationResult, ValidationError, Adventure } from '../types/index.js';

/**
 * Initialize AJV with formats support
 */
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

const validateSchema = ajv.compile(adventureSchema);

/**
 * Validate a JSON string against the adventure schema.
 * Also performs semantic validation beyond JSON Schema rules.
 *
 * @param jsonString - Raw JSON string to validate
 * @returns ValidationResult with errors if invalid
 */
export function validateAdventure(jsonString: string): ValidationResult {
  // Step 1: Parse JSON (catch syntax errors)
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    const error = err as Error;
    return {
      valid: false,
      errors: [{
        path: '$',
        message: `Invalid JSON: ${error.message}`
      }]
    };
  }

  // Step 2: Validate with AJV against the JSON Schema
  const valid = validateSchema(parsed);
  if (!valid) {
    const errors: ValidationError[] = (validateSchema.errors || []).map((err) => ({
      path: err.instancePath || '$',
      message: err.message || 'Validation error'
    }));
    return { valid: false, errors };
  }

  // Step 3: Semantic validation
  const adventure = parsed as Adventure;
  const semanticErrors = performSemanticValidation(adventure);

  if (semanticErrors.length > 0) {
    return { valid: false, errors: semanticErrors };
  }

  // Step 4: All valid
  return { valid: true };
}

/**
 * Performs semantic validation beyond JSON Schema rules.
 *
 * Semantic rules:
 * - Scene IDs must be unique (no duplicates)
 * - There must be at least one scene with id "start"
 * - All choice.target values must reference an existing scene.id
 * - Scenes with empty choices are valid (ending scenes)
 */
function performSemanticValidation(adventure: Adventure): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!adventure.scenes || adventure.scenes.length === 0) {
    errors.push({
      path: 'scenes',
      message: 'Adventure must have at least one scene'
    });
    return errors;
  }

  // Check for duplicate scene IDs
  const sceneIds = adventure.scenes.map(s => s.id);
  const uniqueIds = new Set(sceneIds);

  if (uniqueIds.size !== sceneIds.length) {
    const duplicates = sceneIds.filter((id, index) => sceneIds.indexOf(id) !== index);
    errors.push({
      path: 'scenes',
      message: `Duplicate scene IDs found: ${[...new Set(duplicates)].join(', ')}`
    });
  }

  // Check for "start" scene
  const hasStartScene = sceneIds.includes('start');
  if (!hasStartScene) {
    errors.push({
      path: 'scenes',
      message: 'A scene with id="start" is required'
    });
  }

  // Build set of valid scene IDs
  const validSceneIds = new Set(sceneIds);

  // Validate all choice.target values reference existing scenes
  adventure.scenes.forEach((scene, sceneIndex) => {
    scene.choices.forEach((choice, choiceIndex) => {
      if (!validSceneIds.has(choice.target)) {
        errors.push({
          path: `scenes[${sceneIndex}].choices[${choiceIndex}].target`,
          message: `Choice target "${choice.target}" does not exist in any scene`
        });
      }
    });
  });

  return errors;
}

export { validateSchema };