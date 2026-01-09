/**
 * Search Command
 * Search for tasks
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerSearchCommand(program) {
  program
    .command('search [query]')
    .alias('s')
    .description('Search for tasks by name, note, or filters')
    .option('-l, --limit <n>', 'Maximum results', '50')
    .option('-a, --all', 'Include completed tasks')
    .option('-p, --project <name>', 'Filter by project')
    .option('-t, --tag <name>', 'Filter by tag')
    .option('-f, --flagged', 'Only flagged tasks')
    .option('--available', 'Only available tasks (not blocked/deferred)')
    .option('--due-before <date>', 'Due before date')
    .option('--due-after <date>', 'Due after date')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of search "meeting"                           # Text search
  of search --project "Work"                    # All tasks in project
  of search --tag "Urgent" --flagged            # Urgent flagged tasks
  of search --due-before "tomorrow"             # Due soon
  of search "report" --project "Q1" --tag "Review"  # Combined filters
  of search --available --limit 20              # Next available tasks
`)
    .action(async (query, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          includeCompleted: options.all || false
        };

        // Add filters
        if (options.project) opts.project = options.project;
        if (options.tag) opts.tag = options.tag;
        if (options.flagged) opts.flagged = true;
        if (options.available) opts.available = true;
        if (options.dueBefore) opts.dueBefore = options.dueBefore;
        if (options.dueAfter) opts.dueAfter = options.dueAfter;

        const result = await runJxa('read', 'search', [query || '', JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
