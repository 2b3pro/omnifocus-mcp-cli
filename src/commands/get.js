/**
 * Get Command
 * Get details of tasks, projects, folders, or tags
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerGetCommand(program) {
  const get = program
    .command('get')
    .description('Get details of a task, project, folder, or tag');

  // Get task details
  get
    .command('task <id>')
    .alias('t')
    .description('Get task details by ID')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of get task abc123                     # Get task details
  of get t abc123 --json                 # JSON output
  of get task abc123 --pretty            # Formatted JSON
`)
    .action(async (id, options) => {
      try {
        await requireOmniFocus();
        const result = await runJxa('read', 'getTask', [id]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Get project details
  get
    .command('project <nameOrId>')
    .alias('p')
    .description('Get project details by name or ID')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of get project "Work"                  # Get by name
  of get p abc123                        # Get by ID
  of get project "Work" --pretty         # Formatted JSON
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const result = await runJxa('read', 'getProject', [nameOrId]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Get project tasks
  get
    .command('project-tasks <nameOrId>')
    .alias('pt')
    .description('List tasks in a project')
    .option('-l, --limit <n>', 'Maximum results', '100')
    .option('-a, --all', 'Include completed tasks')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of get project-tasks "Work"            # List tasks in project
  of get pt "Work" --all                 # Include completed tasks
  of get pt "Work" --limit 10            # First 10 tasks
  of get pt "Work" -q | xargs of flag    # Flag all tasks in project
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          includeCompleted: options.all || false
        };
        const result = await runJxa('read', 'listProjectTasks', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
