/**
 * Folder Command
 * Create, modify, and manage folders
 */

import { runJxa, requireOmniFocus, runAppleScript } from '../jxa-runner.js';
import { print, printError } from '../output.js';

export function registerFolderCommand(program) {
  const folder = program
    .command('folder')
    .description('Manage folders');

  // Create folder
  folder
    .command('add <name>')
    .alias('create')
    .description('Create a new folder')
    .option('-p, --parent <name>', 'Parent folder (default: root)')
    .option('--dry-run', 'Preview without creating')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of folder add "Work"
  of folder add "Clients" --parent "Work"
  of folder add "Personal Projects" --dry-run
`)
    .action(async (name, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          parent: options.parent || null,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'addFolder', [name, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Modify folder
  folder
    .command('modify <nameOrId>')
    .alias('mod')
    .description('Modify an existing folder')
    .option('--name <name>', 'Rename folder')
    .option('--note <text>', 'Set folder note')
    .option('--hidden', 'Hide folder')
    .option('--visible', 'Show folder')
    .option('--dry-run', 'Preview without modifying')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of folder modify "Work" --name "Career"        # Rename folder
  of folder modify "Personal" --hidden           # Hide folder
  of folder modify "Archive" --visible           # Show folder
  of folder mod "Work" --note "Work projects"    # Set note
`)
    .action(async (nameOrId, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          dryRun: options.dryRun || false
        };
        if (options.name) opts.name = options.name;
        if (options.note !== undefined) opts.note = options.note;
        if (options.hidden) opts.hidden = true;
        if (options.visible) opts.hidden = false;

        const result = await runJxa('write', 'modifyFolder', [nameOrId, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Move project to folder
  program
    .command('move <projectNameOrId>')
    .description('Move a project to a different folder')
    .option('-f, --folder <name>', 'Target folder (omit for root)')
    .option('--dry-run', 'Preview without moving')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Examples:
  of move "My Project" --folder "Work"
  of move "Old Project" --folder ""        # Move to root
  of move abc123 --folder "Personal"       # By project ID
`)
    .action(async (projectNameOrId, options) => {
      try {
        await requireOmniFocus();

        // Dry-run uses JXA for preview
        if (options.dryRun) {
          const opts = { folder: options.folder || null, dryRun: true };
          const result = await runJxa('write', 'moveProject', [projectNameOrId, JSON.stringify(opts)]);
          print(result, options);
          return;
        }

        // Use AppleScript to get project info and move in one operation
        const escapedProjectId = projectNameOrId.replace(/"/g, '\\"');

        // First, verify project exists and get its name (fast AppleScript)
        const checkScript = `tell application "OmniFocus" to tell front document
          set p to first flattened project whose name is "${escapedProjectId}" or id is "${escapedProjectId}"
          set oldFolder to "(root)"
          try
            set oldFolder to name of folder of p
          end try
          return name of p & "|" & oldFolder
        end tell`;

        const checkResult = await runAppleScript(checkScript);
        const [projectName, oldFolder] = checkResult.split('|');

        // Now perform the move
        const escapedProjectName = projectName.replace(/"/g, '\\"');
        let moveScript;
        if (options.folder) {
          const escapedFolder = options.folder.replace(/"/g, '\\"');
          moveScript = `tell application "OmniFocus" to tell front document to move (first flattened project whose name is "${escapedProjectName}") to (end of sections of (first folder whose name is "${escapedFolder}"))`;
        } else {
          moveScript = `tell application "OmniFocus" to tell front document to move (first flattened project whose name is "${escapedProjectName}") to end of sections`;
        }

        await runAppleScript(moveScript);

        // Get new folder (fast AppleScript)
        const newFolderScript = `tell application "OmniFocus" to tell front document
          set p to first flattened project whose name is "${escapedProjectName}"
          try
            return name of folder of p
          on error
            return "(root)"
          end try
        end tell`;
        const newFolder = await runAppleScript(newFolderScript);

        print({
          success: true,
          message: `Project moved from "${oldFolder}" to "${newFolder}"`,
          project: { name: projectName, folderName: newFolder === '(root)' ? null : newFolder }
        }, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
