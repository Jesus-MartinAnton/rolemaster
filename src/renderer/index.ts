/**
 * Interactive Story Renderer
 * Phase 4: Terminal-based adventure player
 */

import type { Adventure, Scene } from '../types/index.js';
import pc from 'picocolors';
import { createInterface } from 'readline';

/**
 * Wraps text to specified width for terminal display.
 *
 * @param text - Text to wrap
 * @param width - Max width (default: 80)
 * @returns Wrapped text with line breaks
 */
function wrapText(text: string, width: number = 78): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 > width) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine += (currentLine.length > 0 ? ' ' : '') + word;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

/**
 * Displays a scene with title, text, and choices.
 *
 * @param scene - The scene to display
 */
function displayScene(scene: Scene): void {
  // Clear some space
  console.log();

  // Scene title in bold
  console.log(pc.bold(pc.cyan(`\n━━━ ${scene.title.toUpperCase()} ━━━`)));
  console.log();

  // Scene text with wrapping
  console.log(wrapText(scene.text));
  console.log();

  // Display choices if any
  if (scene.choices.length > 0) {
    console.log(pc.bold(pc.gray('  Choices:')));
    console.log();

    scene.choices.forEach((choice, index) => {
      const num = pc.green(`${index + 1}.`);
      console.log(`  ${num} ${choice.text}`);
    });

    console.log();
  }
}

/**
 * Play an adventure interactively in the terminal.
 * - Shows scene title + text
 * - Presents choices numbered
 * - Reads user input (number or "q" to quit, "b" to go back)
 * - Maintains a history stack for back navigation
 *
 * @param adventure - The adventure to play
 */
export async function playAdventure(adventure: Adventure): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // 1. Welcome message with adventure title + summary
  console.log(pc.bold(pc.green(`\n🎲 ${adventure.meta.title}`)));
  console.log(pc.dim(`   ${adventure.meta.genre} | ${adventure.meta.tone}\n`));
  console.log(wrapText(adventure.meta.summary));
  console.log();

  // Wait for user to start
  await new Promise<void>((resolve) => {
    rl.question(pc.cyan('  Press Enter to begin...'), () => {
      rl.close();
      resolve();
    });
  });

  // 2. History stack for back navigation: ['start']
  const history: string[] = ['start'];
  let currentSceneId = 'start';

  // Find scene by ID
  const getScene = (id: string): Scene | undefined => {
    return adventure.scenes.find((s) => s.id === id);
  };

  // Game loop
  while (true) {
    const scene = getScene(currentSceneId);

    if (!scene) {
      console.error(pc.red(`\n❌ Scene not found: ${currentSceneId}`));
      break;
    }

    // 3. Display scene (title in bold, text with wrapping)
    displayScene(scene);

    // 4. If no choices → "THE END" + exit
    if (scene.choices.length === 0) {
      console.log(pc.bold(pc.green('\n🏆 THE END\n')));
      console.log(pc.dim(`  Thanks for playing "${adventure.meta.title}"!\n`));
      break;
    }

    // 5. Readline prompt
    const prompt = await new Promise<string>((resolve) => {
      const question = pc.cyan(`  Choose an option (1-${scene.choices.length}) or 'q' to quit, 'b' for back: `);
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });

    // 6. Parse input
    if (prompt.toLowerCase() === 'q') {
      // Quit
      console.log(pc.yellow('\n👋 Goodbye! Thanks for playing!\n'));
      break;
    } else if (prompt.toLowerCase() === 'b') {
      // Go back - pop from history
      if (history.length > 1) {
        history.pop();
        currentSceneId = history[history.length - 1];
        console.log(pc.dim(`  ← Back to previous scene\n`));
      } else {
        console.log(pc.yellow('  Already at the beginning.\n'));
      }
      continue;
    } else {
      // Number input - validate and advance
      const choiceNum = parseInt(prompt, 10);

      if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > scene.choices.length) {
        console.log(pc.red(`  Invalid choice. Enter a number 1-${scene.choices.length}, or 'q' to quit.\n`));
        continue;
      }

      // Get the target scene from the choice
      const choiceIndex = choiceNum - 1;
      const targetSceneId = scene.choices[choiceIndex].target;

      // Push to history and advance
      history.push(targetSceneId);
      currentSceneId = targetSceneId;
      console.log(pc.dim(`  → ${scene.choices[choiceIndex].text}\n`));
    }
  }

  rl.close();
}