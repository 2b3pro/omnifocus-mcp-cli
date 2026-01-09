/**
 * Output formatting utilities for OmniFocus CLI
 */

/**
 * Print result to stdout with formatting options
 * @param {object} result - The result object to print
 * @param {object} options - Formatting options
 */
export function print(result, options = {}) {
  if (options.json || options.pretty) {
    const indent = options.pretty ? 2 : 0;
    console.log(JSON.stringify(result, null, indent));
    return;
  }

  if (options.quiet && result.success) {
    // Just print IDs
    if (result.tasks) {
      result.tasks.forEach(t => console.log(t.id));
    } else if (result.projects) {
      result.projects.forEach(p => console.log(p.id));
    } else if (result.id) {
      console.log(result.id);
    }
    return;
  }

  if (!result.success) {
    printError(result.error || 'Unknown error');
    return;
  }

  // Default formatted output
  if (result.raw) {
    console.log(result.raw);
    return;
  }

  // Format based on result type
  if (result.tasks && result.project) {
    // Project tasks with project type info for prefix
    printProjectTasks(result.tasks, result.project);
  } else if (result.tasks) {
    printTasks(result.tasks);
  } else if (result.projects) {
    printProjects(result.projects);
  } else if (result.folders) {
    printFolders(result.folders);
  } else if (result.tags) {
    printTags(result.tags);
  } else if (result.task) {
    printTaskDetail(result.task);
  } else if (result.project) {
    printProjectDetail(result.project);
  } else if (result.message) {
    console.log(result.message);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

/**
 * Print error message to stderr
 * @param {string} message - Error message
 */
export function printError(message) {
  console.error(`Error: ${message}`);
}

/**
 * Print list of tasks
 */
function printTasks(tasks) {
  if (tasks.length === 0) {
    console.log('No tasks found.');
    return;
  }

  for (const task of tasks) {
    const flagged = task.flagged ? ' ⚑' : '';
    const due = task.dueDate ? ` (${formatDate(task.dueDate)})` : '';
    const tags = task.tags && task.tags.length > 0 ? ` #${task.tags.join(' #')}` : '';
    console.log(`[${task.id}] ${task.name}${flagged}${due}${tags}`);
  }
}

/**
 * Print list of projects
 */
function printProjects(projects) {
  if (projects.length === 0) {
    console.log('No projects found.');
    return;
  }

  for (const project of projects) {
    const status = project.status !== 'active status' ? ` (${project.status})` : '';
    const folder = project.folderName ? ` [${project.folderName}]` : '';
    console.log(`${project.name}${status}${folder}`);
    console.log(`  ID: ${project.id}`);
    if (project.taskCount !== undefined) {
      console.log(`  Tasks: ${project.taskCount}`);
    }
  }
}

/**
 * Print list of folders
 */
function printFolders(folders) {
  if (folders.length === 0) {
    console.log('No folders found.');
    return;
  }

  for (const folder of folders) {
    console.log(`📁 ${folder.name}`);
    console.log(`  ID: ${folder.id}`);
    if (folder.projectCount !== undefined) {
      console.log(`  Projects: ${folder.projectCount}`);
    }
  }
}

/**
 * Print list of tags
 */
function printTags(tags) {
  if (tags.length === 0) {
    console.log('No tags found.');
    return;
  }

  for (const tag of tags) {
    const count = tag.taskCount !== undefined ? ` (${tag.taskCount} tasks)` : '';
    console.log(`🏷️  ${tag.name}${count}`);
    console.log(`  ID: ${tag.id}`);
  }
}

/**
 * Print detailed task info
 */
function printTaskDetail(task) {
  console.log(`Task: ${task.name}`);
  console.log(`ID: ${task.id}`);
  if (task.note) console.log(`Note: ${task.note}`);
  if (task.projectName) console.log(`Project: ${task.projectName}`);
  if (task.deferDate) console.log(`Defer: ${formatDate(task.deferDate)}`);
  if (task.dueDate) console.log(`Due: ${formatDate(task.dueDate)}`);
  if (task.flagged) console.log(`Flagged: Yes`);
  if (task.tags && task.tags.length > 0) console.log(`Tags: ${task.tags.join(', ')}`);
  if (task.estimatedMinutes) console.log(`Estimated: ${task.estimatedMinutes} min`);
  console.log(`Completed: ${task.completed ? 'Yes' : 'No'}`);
}

/**
 * Print detailed project info
 */
function printProjectDetail(project) {
  console.log(`Project: ${project.name}`);
  console.log(`ID: ${project.id}`);
  if (project.note) console.log(`Note: ${project.note}`);
  if (project.folderName) console.log(`Folder: ${project.folderName}`);
  console.log(`Status: ${project.status}`);
  if (project.deferDate) console.log(`Defer: ${formatDate(project.deferDate)}`);
  if (project.dueDate) console.log(`Due: ${formatDate(project.dueDate)}`);
  if (project.taskCount !== undefined) console.log(`Tasks: ${project.taskCount}`);

  // Print tasks with prefix based on project type
  if (project.tasks && project.tasks.length > 0) {
    console.log('');
    printProjectTasks(project.tasks, project);
  }
}

/**
 * Print tasks with prefix based on project type
 */
function printProjectTasks(tasks, project) {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const flagged = task.flagged ? ' ⚑' : '';
    const due = task.dueDate ? ` (${formatDate(task.dueDate)})` : '';
    const tags = task.tags && task.tags.length > 0 ? ` #${task.tags.join(' #')}` : '';

    let prefix;
    if (project.singletonActionHolder) {
      prefix = '• ';
    } else if (project.sequential) {
      prefix = `${i + 1}. `;
    } else {
      prefix = '- ';
    }

    console.log(`${prefix}[${task.id}] ${task.name}${flagged}${due}${tags}`);
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  } catch {
    return dateStr;
  }
}
