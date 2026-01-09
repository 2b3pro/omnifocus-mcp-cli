/**
 * Review Command
 * List projects due for review and manage review workflow
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerReviewCommand(program) {
  program
    .command('review')
    .description('List projects due for review')
    .option('-l, --limit <n>', 'Maximum results', '50')
    .option('-a, --all', 'Include all active projects (not just due for review)')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .addHelpText('after', `
Examples:
  of review                    # List projects due for review
  of review --all              # List all projects with review status
  of review --json --limit 10  # JSON output with limit

To mark a project as reviewed:
  of project review "Project Name"
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();
        const opts = {
          limit: parseInt(options.limit, 10),
          all: options.all || false
        };
        const result = await runJxa('read', 'listReview', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
