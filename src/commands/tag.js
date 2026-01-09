/**
 * Tag Command
 * Create, modify, delete, and list tasks by tag
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerTagCommand(program) {
  const tag = program
    .command('tag')
    .description('Manage tags');

  // Create tag
  tag
    .command('add <name>')
    .alias('create')
    .description('Create a new tag')
    .option('-p, --parent <name>', 'Parent tag for nesting')
    .option('--no-next-action', 'Disable next action (like a "Waiting" tag)')
    .option('--dry-run', 'Preview without creating')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of tag add "Work"
  of tag add "Errands" --parent "Personal"
  of tag add "Waiting" --no-next-action
`)
    .action(async (name, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          parent: options.parent || null,
          allowsNextAction: options.nextAction !== false,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'addTag', [name, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Modify tag
  tag
    .command('modify <nameOrId>')
    .alias('mod')
    .description('Modify an existing tag')
    .option('--name <name>', 'Rename tag')
    .option('--hidden', 'Hide tag')
    .option('--visible', 'Show tag')
    .option('--allows-next', 'Enable next action')
    .option('--no-allows-next', 'Disable next action')
    .option('--dry-run', 'Preview without modifying')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of tag modify "Work" --name "Career"           # Rename tag
  of tag modify "Waiting" --no-allows-next       # Disable next action
  of tag mod "Archive" --hidden                  # Hide tag
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          dryRun: options.dryRun || false
        };
        if (options.name) opts.name = options.name;
        if (options.hidden) opts.hidden = true;
        if (options.visible) opts.hidden = false;
        if (options.allowsNext !== undefined) opts.allowsNextAction = options.allowsNext;

        const result = await runJxa('write', 'modifyTag', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Delete tag
  tag
    .command('delete <nameOrId>')
    .alias('rm')
    .description('Delete a tag')
    .option('--dry-run', 'Preview without deleting')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of tag delete "Old Tag"                        # Delete a tag
  of tag rm "Temp" --dry-run                     # Preview without deleting
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          delete: true,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'modifyTag', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // List tasks by tag
  tag
    .command('tasks <nameOrId>')
    .alias('list')
    .description('List tasks with a specific tag')
    .option('-l, --limit <n>', 'Maximum results', '100')
    .option('-a, --all', 'Include completed tasks')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of tag tasks "Work"
  of tag tasks "Urgent" --limit 10
  of tag list "Review" --all --json
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          includeCompleted: options.all || false
        };
        const result = await runJxa('read', 'listTasksByTag', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
