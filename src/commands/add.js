/**
 * Add Command
 * Add new tasks and projects
 */

import { runJxa, requireOmniFocus } from '../jxa-runner.js';
import { print, printError } from '../output.js';

/**
 * Read stdin if available (non-TTY)
 * Returns array of non-empty lines (trimmed)
 */
async function readStdin() {
  // Only read stdin if it's explicitly piped (isTTY === false)
  // isTTY is undefined in non-TTY environments, true when connected to terminal
  if (process.stdin.isTTY !== false) {
    return [];
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString();
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#')); // Skip empty and comments
}

/**
 * Read stdin preserving indentation for outline parsing
 */
async function readStdinRaw() {
  // Only read stdin if it's explicitly piped (isTTY === false)
  if (process.stdin.isTTY !== false) {
    return '';
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString();
}

/**
 * Parse markdown-like outline into projects with tasks
 * Format:
 *   - Project Name
 *     - Task 1
 *     - Task 2
 *   - Another Project
 *     - Task A
 *
 * Returns: [{ name: "Project Name", tasks: ["Task 1", "Task 2"] }, ...]
 */
function parseOutline(text) {
  const lines = text.split('\n');
  const projects = [];
  let currentProject = null;

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Check indentation level
    const match = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (!match) continue;

    const indent = match[1].length;
    const content = match[2].trim();

    if (indent === 0) {
      // Top-level = new project
      if (currentProject) {
        projects.push(currentProject);
      }
      currentProject = { name: content, tasks: [] };
    } else if (currentProject) {
      // Indented = task under current project
      currentProject.tasks.push(content);
    }
  }

  // Don't forget the last project
  if (currentProject) {
    projects.push(currentProject);
  }

  return projects;
}

export function registerAddCommand(program) {
  const add = program
    .command('add')
    .description('Add a new task or project');

  // Add task (default)
  add
    .command('task [name]', { isDefault: true })
    .alias('t')
    .description('Add a new task (or pipe multiple via stdin)')
    .option('-p, --project <name>', 'Add to specific project (default: inbox)')
    .option('-n, --note <text>', 'Task note')
    .option('-d, --due <date>', 'Due date (today, tomorrow, +3d, 2024-01-15)')
    .option('--defer <date>', 'Defer/start date')
    .option('-f, --flagged', 'Mark as flagged')
    .option('-t, --tag <name>', 'Add primary tag')
    .option('--tags <names>', 'Add multiple tags (comma-separated)')
    .option('-e, --estimate <minutes>', 'Estimated time in minutes')
    .option('--dry-run', 'Preview what would be created without actually creating')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output task ID')
    .addHelpText('after', `
Examples:
  of add "Buy groceries"
  of add task "Call client" --due tomorrow --flagged
  of add "Review proposal" --project "Work" --due +3d
  of add "Meeting prep" --defer tomorrow --due "+1d" --tag "Work"

  # Bulk add from stdin:
  cat tasks.txt | of add --project "Work"
  echo -e "Task 1\\nTask 2" | of add
`)
    .action(async (name, options) => {
      try {
        await requireOmniFocus();

        // Check for stdin input (bulk mode)
        const stdinTasks = await readStdin();

        if (stdinTasks.length > 0) {
          // Bulk mode: add multiple tasks
          const opts = {
            project: options.project || null,
            note: options.note || null,
            dueDate: options.due || null,
            deferDate: options.defer || null,
            flagged: options.flagged || false,
            tag: options.tag || null,
            tags: options.tags ? options.tags.split(',').map(t => t.trim()) : null,
            estimatedMinutes: options.estimate || null,
            dryRun: options.dryRun || false,
            bulk: stdinTasks
          };
          const result = await runJxa('write', 'addTask', ['', JSON.stringify(opts)]);
          print(result, options);
        } else if (name) {
          // Single task mode
          const opts = {
            project: options.project || null,
            note: options.note || null,
            dueDate: options.due || null,
            deferDate: options.defer || null,
            flagged: options.flagged || false,
            tag: options.tag || null,
            tags: options.tags ? options.tags.split(',').map(t => t.trim()) : null,
            estimatedMinutes: options.estimate || null,
            dryRun: options.dryRun || false
          };
          const result = await runJxa('write', 'addTask', [name, JSON.stringify(opts)]);
          print(result, options);
        } else {
          printError('Task name required (or pipe tasks via stdin)');
          process.exit(1);
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Add project
  add
    .command('project <name>')
    .alias('p')
    .description('Add a new project (pipe tasks via stdin, one per line)')
    .option('-f, --folder <name>', 'Add to specific folder')
    .option('-n, --note <text>', 'Project note')
    .option('-d, --due <date>', 'Due date')
    .option('--defer <date>', 'Defer/start date')
    .option('--flagged', 'Mark as flagged')
    .option('-t, --tag <name>', 'Add primary tag')
    .option('--tasks <list>', 'Tasks to add (comma-separated)')
    .option('--sequential', 'Sequential project (tasks must be done in order)')
    .option('--parallel', 'Parallel project (tasks can be done in any order)')
    .option('--single-actions', 'Single action list (no next action logic)')
    .option('--dry-run', 'Preview what would be created without actually creating')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output project ID')
    .addHelpText('after', `
Examples:
  of add project "New Website"
  of add project "Q1 Goals" --folder "Work" --due "2024-03-31"
  of add project "Errands" --single-actions
  of add project "Sprint" --tasks "Design,Implement,Test,Deploy"

  # Pipe tasks from stdin:
  cat tasks.txt | of add project "New Project"
  echo -e "Task 1\\nTask 2\\nTask 3" | of add project "Quick Project"
`)
    .action(async (name, options) => {
      try {
        await requireOmniFocus();

        // Collect tasks from stdin and/or --tasks option
        const stdinTasks = await readStdin();
        const inlineTasks = options.tasks
          ? options.tasks.split(',').map(t => t.trim()).filter(t => t)
          : [];
        const tasks = [...stdinTasks, ...inlineTasks];

        const opts = {
          folder: options.folder || null,
          note: options.note || null,
          dueDate: options.due || null,
          deferDate: options.defer || null,
          flagged: options.flagged || false,
          tag: options.tag || null,
          sequential: options.sequential || false,
          singleActions: options.singleActions || false,
          tasks: tasks.length > 0 ? tasks : null,
          dryRun: options.dryRun || false
        };
        const result = await runJxa('write', 'addProject', [name, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Batch add from outline
  add
    .command('batch')
    .alias('b')
    .description('Add multiple projects with tasks from stdin outline')
    .option('-f, --folder <name>', 'Add all projects to existing folder')
    .option('-c, --create-folder <name>', 'Create new folder for all projects')
    .option('--sequential', 'Make all projects sequential')
    .option('--dry-run', 'Preview what would be created')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .addHelpText('after', `
Reads a markdown-like outline from stdin where:
  - Top-level items (no indent) become projects
  - Indented items become tasks under the project above

Example input:
  - Website Redesign
    - Research competitors
    - Create wireframes
    - Build prototype
  - Marketing Campaign
    - Draft copy
    - Design assets

Usage:
  cat outline.md | of add batch
  cat outline.md | of add batch --folder "Work" --sequential
  cat outline.md | of add batch --create-folder "Q1 2026"
  pbpaste | of add batch --dry-run
`)
    .action(async (options) => {
      try {
        await requireOmniFocus();

        const input = await readStdinRaw();
        if (!input.trim()) {
          printError('No input received. Pipe an outline via stdin.');
          process.exit(1);
        }

        const projects = parseOutline(input);
        if (projects.length === 0) {
          printError('No projects found in input. Use format: "- Project Name" with indented "- Task" items.');
          process.exit(1);
        }

        const opts = {
          folder: options.folder || null,
          createFolder: options.createFolder || null,
          sequential: options.sequential || false,
          dryRun: options.dryRun || false,
          projects: projects
        };

        const result = await runJxa('write', 'addBatch', [JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  // Quick add (shortcut for add task)
  program
    .command('quick <name>')
    .alias('q')
    .description('Quickly add a task to inbox')
    .option('-d, --due <date>', 'Due date')
    .option('-f, --flagged', 'Mark as flagged')
    .option('--json', 'Output as JSON')
    .option('-q, --quiet', 'Only output task ID')
    .action(async (name, options) => {
      try {
        await requireOmniFocus();
        const opts = {
          dueDate: options.due || null,
          flagged: options.flagged || false
        };
        const result = await runJxa('write', 'addTask', [name, JSON.stringify(opts)]);
        print(result, options);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}
