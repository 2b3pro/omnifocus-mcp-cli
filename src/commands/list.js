/**
 * List Command
 * List tasks, projects, folders, and tags
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerListCommand(program) {
  const list = program
    .command('list')
    .alias('ls')
    .description('List tasks, projects, folders, or tags');

  // List inbox tasks
  list
    .command('inbox')
    .alias('i')
    .description('List inbox tasks')
    .option('-l, --limit <n>', 'Maximum results', '100')
    .option('-a, --all', 'Include completed tasks')
    .option('--brief', 'Brief output (faster, fewer details) [default]')
    .option('--full', 'Full output with all task details')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of list inbox                    # List inbox tasks
  of ls i --limit 10               # First 10 inbox tasks
  of list inbox --all              # Include completed tasks
  of list inbox --full             # Full details (slower)
  of list inbox --json             # JSON output
  of list inbox -q | xargs -I {} of complete {}  # Complete all inbox tasks
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          includeCompleted: options.all || false,
          brief: options.full ? false : true
        };
        const result = await runJxa('read', 'listInbox', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // List projects
  list
    .command('projects')
    .alias('p')
    .description('List projects')
    .option('-f, --folder <name>', 'Filter by folder name or ID')
    .option('-l, --limit <n>', 'Maximum results', '100')
    .option('-a, --all', 'Include completed/dropped/on-hold projects')
    .option('--on-hold', 'Include on-hold projects')
    .option('--brief', 'Brief output (faster, fewer details)')
    .option('--full', 'Full output with all project details')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of list projects                      # List active projects
  of ls p --folder "Work"               # Projects in a folder
  of list projects --all                # Include completed/dropped
  of list projects --on-hold            # Include paused projects
  of list projects --full --pretty      # Full details, formatted JSON
  of list projects -q                   # Just IDs (for scripting)
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          folder: options.folder || '',
          includeCompleted: options.all || false,
          includeDropped: options.all || false,
          includeOnHold: options.all || options.onHold || false,
          // Default to brief unless --full is specified (brief is 6x faster)
          brief: options.full ? false : true
        };
        const result = await runJxa('read', 'listProjects', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // List folders
  list
    .command('folders')
    .alias('f')
    .description('List folders')
    .option('-l, --limit <n>', 'Maximum results', '100')
    .option('-f, --folder <name>', 'List subfolders within this folder')
    .option('-r, --root-only', 'Only show top-level folders')
    .option('--hidden', 'Include hidden folders')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of list folders                 # List all folders
  of ls f --root-only             # Only top-level folders
  of list folders -f "Work"       # Subfolders of "Work"
  of list folders --hidden        # Include hidden folders
  of list folders --json          # JSON output for scripting
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          includeHidden: options.hidden || false,
          rootOnly: options.rootOnly || false,
          folder: options.folder || null
        };
        const result = await runJxa('read', 'listFolders', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // List tags
  list
    .command('tags')
    .alias('t')
    .description('List tags')
    .option('-l, --limit <n>', 'Maximum results', '100')
    .option('--hidden', 'Include hidden tags')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of list tags                    # List all tags
  of ls t --hidden                # Include hidden tags
  of list tags --json             # JSON output
  of list tags -q                 # Just IDs
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          includeHidden: options.hidden || false
        };
        const result = await runJxa('read', 'listTags', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // List today's tasks
  list
    .command('today')
    .description('List tasks due or available today')
    .option('-l, --limit <n>', 'Maximum results', '100')
    .option('--flagged', 'Include flagged tasks')
    .option('--brief', 'Brief output (faster, fewer details) [default]')
    .option('--full', 'Full output with all task details')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of list today                   # Tasks due/available today
  of list today --flagged         # Include all flagged tasks
  of list today --full            # Full details (slower)
  of list today -q | wc -l        # Count today's tasks
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          includeFlagged: options.flagged || false,
          // Default to brief unless --full is specified (brief is much faster)
          brief: options.full ? false : true
        };
        const result = await runJxa('read', 'listToday', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // List flagged tasks
  list
    .command('flagged')
    .description('List flagged tasks')
    .option('-l, --limit <n>', 'Maximum results', '100')
    .option('-a, --all', 'Include completed tasks')
    .option('--brief', 'Brief output (faster, fewer details) [default]')
    .option('--full', 'Full output with all task details')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of list flagged                 # List flagged tasks
  of list flagged --all           # Include completed flagged tasks
  of list flagged --limit 5       # Top 5 flagged tasks
  of list flagged --full --pretty # Full details, formatted
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          includeCompleted: options.all || false,
          brief: options.full ? false : true
        };
        const result = await runJxa('read', 'listFlagged', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // List forecast
  list
    .command('forecast')
    .description('List upcoming tasks (forecast view)')
    .option('-d, --days <n>', 'Number of days to show', '7')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of list forecast                # Next 7 days
  of list forecast --days 14      # Next 2 weeks
  of list forecast --days 1       # Just tomorrow
  of list forecast --json         # JSON for scripting
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const opts = {
          days: parseInt(options.days, 10)
        };
        const result = await runJxa('read', 'getForecast', [JSON.stringify(opts)]);

        if (options.json || options.pretty) {
          print(result, options);
        } else if (result.success && result.forecast) {
          for (const day of result.forecast) {
            console.log(`\n${day.date} (${day.count} tasks)`);
            for (const task of day.tasks) {
              const flagged = task.flagged ? '⚑ ' : '';
              console.log(`  ${flagged}${task.name}`);
            }
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
