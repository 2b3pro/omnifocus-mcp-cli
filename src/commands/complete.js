/**
 * Complete Command
 * Mark tasks as complete, incomplete, or dropped
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerCompleteCommand(program) {
  // Mark complete
  program
    .command('complete <taskIds...>')
    .alias('done')
    .description('Mark task(s) as complete')
    .option('--dry-run', 'Preview what would be completed without actually completing')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of complete abc123                     # Complete single task
  of complete abc123 def456 ghi789       # Complete multiple tasks
  of done abc123                         # Using alias
  of complete abc123 --dry-run           # Preview without completing

  # Complete all tasks from a list:
  of list inbox -q | xargs of complete
  of search "meeting" -q | xargs of done
`)
    .action(async (taskIds, options) => {
      try {
        await requireOmniFocus();
        const ids = taskIds.join(',');
        const result = await runJxa('write', 'completeTask', [ids, JSON.stringify({ dryRun: options.dryRun || false })]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Mark dropped
  program
    .command('drop <taskIds...>')
    .description('Mark task(s) as dropped')
    .option('--dry-run', 'Preview what would be dropped without actually dropping')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of drop abc123                         # Drop single task
  of drop abc123 def456                  # Drop multiple tasks
  of drop abc123 --dry-run               # Preview without dropping
`)
    .action(async (taskIds, options) => {
      try {
        await requireOmniFocus();
        const ids = taskIds.join(',');
        const result = await runJxa('write', 'dropTask', [ids, JSON.stringify({ dryRun: options.dryRun || false })]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Delete task
  program
    .command('delete <taskIds...>')
    .alias('rm')
    .description('Delete task(s) permanently')
    .option('--dry-run', 'Preview what would be deleted without actually deleting')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of delete abc123                       # Delete single task
  of rm abc123 def456                    # Delete multiple (using alias)
  of delete abc123 --dry-run             # Preview without deleting
`)
    .action(async (taskIds, options) => {
      try {
        await requireOmniFocus();
        const ids = taskIds.join(',');
        const result = await runJxa('write', 'deleteTask', [ids, JSON.stringify({ dryRun: options.dryRun || false })]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
