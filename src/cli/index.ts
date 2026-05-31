/**
 * RoleMaster CLI Entry Point
 * Phase 4: CLI with Commander
 */

import { Command } from 'commander';
import pc from 'picocolors';
import { generateAdventure } from '../tools/generate.js';
import { saveAdventure, loadAdventure, listAdventures } from '../tools/storage.js';
import { playAdventure } from '../renderer/index.js';

const program = new Command();

program
  .name('rolemaster')
  .description('AI-powered TTRPG adventure generator CLI')
  .version('1.0.0');

// COMMAND 1: generate <prompt>
program
  .command('generate')
  .description('Generate a new adventure from a natural language prompt')
  .argument('<prompt>', 'the adventure concept in natural language')
  .option('-s, --save', 'save the adventure after generating')
  .action(async (prompt, options) => {
    try {
      // 1. Show loading message with picocolors
      console.log(pc.cyan('🎲 Generating adventure...'));
      console.log(pc.dim(`  Concept: "${prompt}"\n`));

      // 2. Call generateAdventure from tools
      const adventure = await generateAdventure(prompt);

      // 3. Show success message with adventure title
      console.log(pc.green('\n✨ Adventure generated successfully!'));
      console.log(pc.bold(`\n  📖 ${adventure.meta.title}`));
      console.log(pc.dim(`     ${adventure.meta.summary}\n`));
      console.log(pc.dim(`     Genre: ${adventure.meta.genre} | Tone: ${adventure.meta.tone}`));
      console.log(pc.dim(`     Scenes: ${adventure.scenes.length}\n`));

      // 4. Offer to play now - prompt user
      const rl = await import('readline');
      const readline = rl.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question(pc.cyan('  Want to play now? (y/n): '), (ans) => {
          readline.close();
          resolve(ans.trim().toLowerCase());
        });
      });

      if (answer === 'y' || answer === 'yes' || answer === 's' || answer === 'sí') {
        console.log(pc.cyan('\n🎮 Starting adventure...\n'));
        await playAdventure(adventure);
      } else {
        // FIX: Always save the adventure when user declines to play,
        // regardless of --save flag. Keeps backward compat.
        const id = await saveAdventure(adventure);
        console.log(pc.green(`\n💾 Saved to: ~/.rolemaster/adventures/${id}.json`));
      }
    } catch (err) {
      const error = err as Error;
      console.error(pc.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// COMMAND 2: play <id>
program
  .command('play')
  .description('Play a saved adventure')
  .argument('<id>', 'adventure ID to play')
  .action(async (id) => {
    try {
      console.log(pc.cyan(`📂 Loading adventure: ${id}...\n`));

      // 1. Load adventure with loadAdventure
      const adventure = await loadAdventure(id);

      // 2. Call playAdventure from renderer
      await playAdventure(adventure);
    } catch (err) {
      const error = err as Error;
      console.error(pc.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// COMMAND 3: list
program
  .command('list')
  .description('List all saved adventures')
  .action(async () => {
    try {
      // 1. Call listAdventures
      const adventures = await listAdventures();

      // 2. Display as a nice table
      if (adventures.length === 0) {
        console.log(pc.yellow('No adventures found.') + pc.dim(' Run `rolemaster generate` to create one.'));
        return;
      }

      // Build ASCII table
      const header = 'ID                    Title                    Genre    Created';
      const divider = '─'.repeat(60);

      console.log(pc.bold('\n  ADVENTURES\n'));
      console.log(pc.dim(`  ${divider}`));
      console.log(pc.bold(`  ${header}`));
      console.log(pc.dim(`  ${divider}`));

      for (const adv of adventures) {
        // Truncate title to fit
        const title = adv.title.length > 22 ? adv.title.substring(0, 19) + '...' : adv.title;
        const id = adv.id.length > 20 ? adv.id.substring(0, 17) + '...' : adv.id;
        const created = adv.createdAt.split('T')[0]; // Just the date

        console.log(
          pc.cyan(`  ${id.padEnd(20)}`) +
          pc.white(`${title.padEnd(24)}`) +
          pc.dim(`${adv.genre.padEnd(10)}`) +
          pc.dim(created)
        );
      }

      console.log(pc.dim(`  ${divider}\n`));
      console.log(pc.dim(`  Total: ${adventures.length} adventure(s)\n`));
    } catch (err) {
      const error = err as Error;
      console.error(pc.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();