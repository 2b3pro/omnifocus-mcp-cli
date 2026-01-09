/**
 * Modify Command
 * Modify existing tasks and projects
 */

import { runJxa, requireOmniFocus, runAppleScript } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerModifyCommand(program) {
  program
    .command('modify <taskId>')
    .alias('mod')
    .description('Modify an existing task')
    .option('--name <name>', 'Set task name')
    .option('-n, --note <text>', 'Set task note')
    .option('-d, --due <date>', 'Set due date (use "" to clear)')
    .option('--due-by <offset>', 'Adjust due date relatively (+3d, -1w, +2m)')
    .option('--defer <date>', 'Set defer date (use "" to clear)')
    .option('--defer-by <offset>', 'Adjust defer date relatively (+3d, -1w, +2m)')
    .option('-f, --flag', 'Set flagged')
    .option('--unflag', 'Remove flag')
    .option('-t, --tag <name>', 'Set primary tag (use "" to clear)')
    .option('-p, --project <name>', 'Move to project')
    .option('-e, --estimate <minutes>', 'Set estimated time in minutes')
    .option('--dry-run', 'Preview what would be modified without actually modifying')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  ofocus modify abc123 --due tomorrow
  ofocus modify abc123 --name "Updated task name" --flag
  ofocus modify abc123 --project "Work" --tag "Urgent"
  ofocus modify abc123 --due "" --defer ""   # Clear dates
`)
    .action(async (taskId, options) => {
      try {
        await requireOmniFocus();

        const opts = {};

        if (options.name !== undefined) opts.name = options.name;
        if (options.note !== undefined) opts.note = options.note;
        if (options.due !== undefined) opts.dueDate = options.due || null;
        if (options.dueBy) opts.dueBy = options.dueBy;
        if (options.defer !== undefined) opts.deferDate = options.defer || null;
        if (options.deferBy) opts.deferBy = options.deferBy;
        if (options.flag) opts.flagged = true;
        if (options.unflag) opts.flagged = false;
        if (options.tag !== undefined) opts.tag = options.tag || null;
        if (options.project !== undefined) opts.project = options.project;
        if (options.estimate !== undefined) opts.estimatedMinutes = options.estimate;

        if (Object.keys(opts).length === 0) {
          printError('No modifications specified. Use --help for options.');
          process.exit(1);
        }

        opts.dryRun = options.dryRun || false;
        const result = await runJxa('write', 'modifyTask', [taskId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Flag shortcut
  program
    .command('flag <taskIds...>')
    .description('Flag task(s)')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  of flag abc123                         # Flag single task
  of flag abc123 def456 ghi789           # Flag multiple tasks
  of list inbox -q | xargs of flag       # Flag all inbox tasks
`)
    .action(async (taskIds, options) => {
      try {
        await requireOmniFocus();
        const results = [];
        for (const taskId of taskIds) {
          const result = await runJxa('write', 'modifyTask', [taskId, JSON.stringify({ flagged: true })]);
          results.push(result);
        }
        if (options.json) {
          console.log(JSON.stringify({ success: true, results }));
        } else {
          console.log(`${taskIds.length} task(s) flagged`);
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Unflag shortcut
  program
    .command('unflag <taskIds...>')
    .description('Remove flag from task(s)')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  of unflag abc123                       # Unflag single task
  of unflag abc123 def456                # Unflag multiple tasks
  of list flagged -q | xargs of unflag   # Unflag all flagged tasks
`)
    .action(async (taskIds, options) => {
      try {
        await requireOmniFocus();
        const results = [];
        for (const taskId of taskIds) {
          const result = await runJxa('write', 'modifyTask', [taskId, JSON.stringify({ flagged: false })]);
          results.push(result);
        }
        if (options.json) {
          console.log(JSON.stringify({ success: true, results }));
        } else {
          console.log(`${taskIds.length} task(s) unflagged`);
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Reorder task
  program
    .command('reorder <taskId>')
    .description('Reorder a task within its project')
    .option('--top', 'Move to first position')
    .option('--bottom', 'Move to last position')
    .option('--before <targetId>', 'Move before another task')
    .option('--after <targetId>', 'Move after another task')
    .option('--dry-run', 'Preview without reordering')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of reorder abc123 --top                  # Move to first position
  of reorder abc123 --bottom               # Move to last position
  of reorder abc123 --before def456        # Move before another task
  of reorder abc123 --after def456         # Move after another task
  of reorder abc123 --top --dry-run        # Preview without moving
`)
    .action(async (taskId, options) => {
      try {
        await requireOmniFocus();

        // Validate options - exactly one position option required
        const positionOpts = [options.top, options.bottom, options.before, options.after].filter(Boolean);
        if (positionOpts.length === 0) {
          printError('Specify position: --top, --bottom, --before <taskId>, or --after <taskId>');
          process.exit(1);
        }
        if (positionOpts.length > 1) {
          printError('Only one position option allowed');
          process.exit(1);
        }

        const escapedTaskId = taskId.replace(/"/g, '\\"');

        // Get task info first
        const getTaskScript = `tell application "OmniFocus" to tell front document
  set t to first flattened task whose id is "${escapedTaskId}"
  set proj to containing project of t
  if proj is missing value then
    error "Task is not in a project"
  end if
  return (name of t) & "|" & (id of proj) & "|" & (name of proj)
end tell`;

        const taskInfo = await runAppleScript(getTaskScript);
        const [taskName, projectId, projectName] = taskInfo.split('|');

        if (options.dryRun) {
          let position = options.top ? 'first' : options.bottom ? 'last' :
                        options.before ? `before task ${options.before}` : `after task ${options.after}`;
          if (options.json || options.pretty) {
            print({
              success: true,
              dryRun: true,
              message: `Would move "${taskName}" to ${position} in "${projectName}"`,
              task: { id: taskId, name: taskName },
              project: { id: projectId, name: projectName }
            }, options);
          } else {
            console.log(`[DRY RUN] Would move "${taskName}" to ${position} in "${projectName}"`);
          }
          return;
        }

        // Build the move script
        let moveScript;
        if (options.top) {
          moveScript = `tell application "OmniFocus" to tell front document
  set t to first flattened task whose id is "${escapedTaskId}"
  set proj to containing project of t
  move t to beginning of tasks of proj
end tell`;
        } else if (options.bottom) {
          moveScript = `tell application "OmniFocus" to tell front document
  set t to first flattened task whose id is "${escapedTaskId}"
  set proj to containing project of t
  move t to end of tasks of proj
end tell`;
        } else if (options.before) {
          const escapedTarget = options.before.replace(/"/g, '\\"');
          moveScript = `tell application "OmniFocus" to tell front document
  set t to first flattened task whose id is "${escapedTaskId}"
  set targetTask to first flattened task whose id is "${escapedTarget}"
  move t to before targetTask
end tell`;
        } else if (options.after) {
          const escapedTarget = options.after.replace(/"/g, '\\"');
          moveScript = `tell application "OmniFocus" to tell front document
  set t to first flattened task whose id is "${escapedTaskId}"
  set targetTask to first flattened task whose id is "${escapedTarget}"
  move t to after targetTask
end tell`;
        }

        await runAppleScript(moveScript);

        if (options.json || options.pretty) {
          print({
            success: true,
            message: `Task reordered in "${projectName}"`,
            task: { id: taskId, name: taskName },
            project: { id: projectId, name: projectName }
          }, options);
        } else {
          console.log(`Task "${taskName}" reordered in "${projectName}"`);
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
