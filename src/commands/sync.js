/**
 * Sync Command
 * Sync and utility commands
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerSyncCommand(program) {
  // Sync command
  program
    .command('sync')
    .description('Synchronize OmniFocus with sync server')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  of sync                                # Trigger sync with server
  of sync --json                         # JSON output
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const result = await runJxa('write', 'sync', []);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Quick Entry command
  program
    .command('qe [name]')
    .alias('quick-entry')
    .description('Open Quick Entry panel (optionally with task)')
    .option('-n, --note <text>', 'Task note')
    .option('-d, --due <date>', 'Due date')
    .option('--defer <date>', 'Defer date')
    .option('-f, --flagged', 'Mark as flagged')
    .option('--save', 'Auto-save the task')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  ofocus qe                           # Just open Quick Entry
  ofocus qe "New task"                # Open with task pre-filled
  ofocus qe "Urgent task" --flagged   # Flagged task
  ofocus qe "Due task" --due tomorrow --save  # Create and save
`)
    .action(async (name, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          name: name || null,
          note: options.note || null,
          dueDate: options.due || null,
          deferDate: options.defer || null,
          flagged: options.flagged || false,
          autoSave: options.save || false
        };
        const result = await runJxa('write', 'quickEntry', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // List perspectives
  program
    .command('perspectives')
    .alias('persp')
    .description('List available perspectives')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of perspectives                        # List all perspectives
  of persp --json                        # JSON output
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const result = await runJxa('read', 'listPerspectives', []);

        if (options.json || options.pretty) {
          print(result, options);
        } else if (result.success && result.perspectives) {
          console.log('Available Perspectives:');
          for (const p of result.perspectives) {
            console.log(`  ${p.name}`);
          }
        } else {
          print(result, options);
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
