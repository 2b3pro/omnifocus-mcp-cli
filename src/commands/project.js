/**
 * Project Command
 * Manage project lifecycle (complete, drop, hold, activate, review)
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerProjectCommand(program) {
  const project = program
    .command('project')
    .alias('proj')
    .description('Manage project lifecycle');

  // Complete project
  project
    .command('complete <nameOrId>')
    .alias('done')
    .description('Mark project as complete')
    .option('--dry-run', 'Preview without completing')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of project complete "My Project"       # Complete by name
  of proj done abc123                    # Complete by ID
  of project complete "Work" --dry-run   # Preview without completing
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          complete: true,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'modifyProject', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Drop project
  project
    .command('drop <nameOrId>')
    .description('Mark project as dropped')
    .option('--dry-run', 'Preview without dropping')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of project drop "Old Project"          # Drop a project
  of project drop abc123 --dry-run       # Preview without dropping
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          drop: true,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'modifyProject', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Delete project(s) — permanent, unlike `drop` which only sets a status
  project
    .command('delete <nameOrIds...>')
    .alias('rm')
    .description('Delete project(s) permanently — refuses non-empty projects without --force')
    .option('--force', 'Delete even if the project still contains tasks')
    .option('--dry-run', 'Preview what would be deleted, including task counts')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
'project drop' only marks a project dropped — it stays in your database with all
its tasks. This removes it permanently, along with every task inside it.
An empty project deletes directly; one holding tasks is refused unless you pass
--force, and the refusal reports exactly how many tasks would go.

Examples:
  of project delete "Old Project"                # only if it has no tasks
  of project delete "Old Project" --dry-run      # show what it holds first
  of project delete "Old Project" --force        # delete it and its tasks
  of project rm "A" "B"                          # several at once
`)
    .action(async (nameOrIds, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          force: options.force || false,
          dryRun: options.dryRun || false
        };
        // JSON array, not comma-joined: project NAMES may contain commas.
        const result = await runJxa('write', 'deleteProject', [JSON.stringify(nameOrIds), JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Hold project
  project
    .command('hold <nameOrId>')
    .alias('pause')
    .description('Put project on hold')
    .option('--dry-run', 'Preview without holding')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of project hold "Paused Project"       # Put on hold
  of proj pause "Work"                   # Using alias
  of project hold abc123 --dry-run       # Preview without holding
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          hold: true,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'modifyProject', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Activate project
  project
    .command('activate <nameOrId>')
    .alias('resume')
    .description('Resume an on-hold project')
    .option('--dry-run', 'Preview without activating')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of project activate "Paused Project"   # Resume project
  of proj resume "Work"                  # Using alias
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          activate: true,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'modifyProject', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Review project
  project
    .command('review <nameOrId>')
    .description('Mark project as reviewed')
    .option('--dry-run', 'Preview without marking reviewed')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of project review "Work"               # Mark as reviewed
  of project review abc123 --json        # JSON output
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          reviewed: true,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'modifyProject', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Modify project (general)
  project
    .command('modify <nameOrId>')
    .alias('mod')
    .description('Modify project properties')
    .option('--name <name>', 'Rename project')
    .option('-n, --note <text>', 'Set project note')
    .option('-d, --due <date>', 'Set due date')
    .option('--defer <date>', 'Set defer date')
    .option('--clear-due', 'Clear due date')
    .option('--clear-defer', 'Clear defer date')
    .option('-f, --flag', 'Flag project')
    .option('--unflag', 'Unflag project')
    .option('--sequential', 'Set to sequential')
    .option('--parallel', 'Set to parallel')
    .option('-t, --tag <name>', 'Set primary tag (use "" to clear)')
    .option('--review-interval <interval>', 'Set review cadence: <n><d|w|m|y> (e.g. 1w, 2m)')
    .option('--status <status>', 'Set status (active, on-hold, dropped)')
    .option('--dry-run', 'Preview without modifying')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of project modify "My Project" --name "Renamed Project"
  of project modify "Work" --due "+7d" --flag
  of project modify "Paused" --status active
  of project modify "Done" --status completed
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          dryRun: options.dryRun || false
        };

        if (options.name) opts.name = options.name;
        if (options.note !== undefined) opts.note = options.note;
        if (options.due) opts.dueDate = options.due;
        if (options.defer) opts.deferDate = options.defer;
        if (options.clearDue) opts.clearDue = true;
        if (options.clearDefer) opts.clearDefer = true;
        if (options.flag) opts.flagged = true;
        if (options.unflag) opts.flagged = false;
        if (options.sequential) opts.sequential = true;
        if (options.parallel) opts.sequential = false;
        if (options.tag !== undefined) opts.tag = options.tag || null;
        if (options.reviewInterval) opts.reviewInterval = options.reviewInterval;
        if (options.status) opts.status = options.status;

        const result = await runJxa('write', 'modifyProject', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
