/**
 * RoleMaster CLI Entry Point
 * Phase 4: CLI with Commander
 */

import { Command } from 'commander';
import pc from 'picocolors';
import { generateAdventure } from '../tools/generate.js';
import { saveAdventure, loadAdventure, listAdventures, deleteAdventure } from '../tools/storage.js';
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
  .action(async (prompt) => {
    try {
      // 1. Show loading message
      console.log(`\n  ${pc.bold('🎲 RoleMaster')} — AI-powered adventure generator\n`);
      console.log(`  ${pc.dim('Concept:')} "${prompt}"\n`);

      // 2. Generate adventure
      const adventure = await generateAdventure(prompt);

      // 3. Auto-save FIRST (always)
      const id = await saveAdventure(adventure);

      // 4. Show success with clean summary
      console.log(`  ${pc.green('✓')} ${pc.bold(adventure.meta.title)}`);
      console.log(`    ${pc.dim(adventure.meta.summary)}`);
      console.log(`    ${pc.dim('Genre:')} ${adventure.meta.genre}  ${pc.dim('Tone:')} ${adventure.meta.tone}  ${pc.dim('Scenes:')} ${adventure.scenes.length}`);
      console.log(`    ${pc.dim('Saved as:')} ${pc.cyan(id)}\n`);

      // 5. Ask to play
      const rl = await import('readline');
      const readline = rl.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>((resolve) => {
        readline.question(`  ${pc.dim('Play now?')} ${pc.cyan('(y/N)')}: `, (ans) => {
          readline.close();
          resolve(ans.trim().toLowerCase());
        });
      });

      if (answer === 'y' || answer === 'yes' || answer === 's' || answer === 'sí') {
        console.log(`\n  ${pc.cyan('━'.repeat(40))}\n`);
        await playAdventure(adventure);
      } else {
        console.log(`\n  ${pc.dim('Tip:')} ${pc.white('rolemaster play')} ${pc.cyan(id)}\n`);
      }
    } catch (err) {
      const error = err as Error;
      console.error(`\n  ${pc.red('✗')} ${error.message}\n`);
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
      const adventure = await loadAdventure(id);
      console.log(`  ${pc.green('✓')} ${pc.bold(adventure.meta.title)}`);
      console.log(`    ${pc.dim('Genre:')} ${adventure.meta.genre}  ${pc.dim('Tone:')} ${adventure.meta.tone}  ${pc.dim('Scenes:')} ${adventure.scenes.length}`);
      console.log(`\n  ${pc.cyan('━'.repeat(40))}\n`);
      await playAdventure(adventure);
    } catch (err) {
      const error = err as Error;
      console.error(`\n  ${pc.red('✗')} ${error.message}\n`);
      process.exit(1);
    }
  });

// COMMAND 3: list
program
  .command('list')
  .description('List all saved adventures')
  .action(async () => {
    try {
      const adventures = await listAdventures();

      if (adventures.length === 0) {
        console.log(`\n  ${pc.yellow('No adventures found.')} ${pc.dim('Run `rolemaster generate` to create one.')}\n`);
        return;
      }

      console.log(`\n  ${pc.bold('Saved Adventures')}  ${pc.dim(`(${adventures.length})`)}\n`);

      for (const adv of adventures) {
        const title = adv.title.length > 40 ? adv.title.substring(0, 37) + '...' : adv.title;
        const created = adv.createdAt.split('T')[0];
        console.log(`  ${pc.cyan(adv.id.padEnd(22))} ${pc.white(title.padEnd(42))} ${pc.dim(adv.genre.padEnd(10))} ${pc.dim(created)}`);
      }

      console.log(`\n  ${pc.dim('Tip:')} ${pc.white('rolemaster play <id>')} ${pc.dim('to play an adventure')}\n`);
    } catch (err) {
      const error = err as Error;
      console.error(`\n  ${pc.red('✗')} ${error.message}\n`);
      process.exit(1);
    }
  });

// COMMAND 4: delete <id>
program
  .command('delete')
  .description('Delete a saved adventure')
  .argument('<id>', 'adventure ID to delete')
  .action(async (id) => {
    try {
      const deleted = await deleteAdventure(id);

      if (deleted) {
        console.log(`  ${pc.green('✓')} ${pc.dim('Deleted:')} ${pc.cyan(id)}\n`);
      } else {
        console.log(`  ${pc.yellow('Adventure not found:')} ${pc.cyan(id)}\n`);
      }
    } catch (err) {
      const error = err as Error;
      console.error(`\n  ${pc.red('✗')} ${error.message}\n`);
      process.exit(1);
    }
  });

program.parse();