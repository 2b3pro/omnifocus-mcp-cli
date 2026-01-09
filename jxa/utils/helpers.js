// OmniFocus JXA Shared Helper Functions
// This file is prepended to scripts by the JXA runner.

/**
 * Get command line argument safely
 * @param {number} index - The absolute index expected (4 = first user arg)
 * @param {any} defaultValue - Default value if missing
 * @returns {string|any} - The argument value
 */
function getArg(index, defaultValue) {
  const args = $.NSProcessInfo.processInfo.arguments;

  // Look for "--" separator used by runJxa
  let separatorIndex = -1;
  for (let i = 0; i < args.count; i++) {
    if (ObjC.unwrap(args.objectAtIndex(i)) === "--") {
      separatorIndex = i;
      break;
    }
  }

  let realIndex = index;
  if (separatorIndex !== -1) {
    realIndex = separatorIndex + 1 + (index - 4);
  }

  if (args.count <= realIndex) return defaultValue;
  const arg = ObjC.unwrap(args.objectAtIndex(realIndex));
  return arg && arg.length > 0 ? arg : defaultValue;
}

/**
 * Parse JSON argument safely
 */
function parseJsonArg(index, defaultValue) {
  const arg = getArg(index, null);
  if (!arg) return defaultValue;
  try {
    return JSON.parse(arg);
  } catch {
    return defaultValue;
  }
}

/**
 * Get the OmniFocus application
 */
function getApp() {
  const app = Application("OmniFocus");
  app.includeStandardAdditions = true;
  return app;
}

/**
 * Get the default document
 */
function getDoc(app) {
  return app.defaultDocument;
}

/**
 * Format task for JSON output
 */
function formatTask(task) {
  try {
    const tags = [];
    try {
      const taskTags = task.tags();
      for (let i = 0; i < taskTags.length; i++) {
        tags.push(taskTags[i].name());
      }
    } catch {}

    let projectName = null;
    try {
      const proj = task.containingProject();
      if (proj) projectName = proj.name();
    } catch {}

    return {
      id: task.id(),
      name: task.name(),
      note: task.note() || "",
      completed: task.completed(),
      flagged: task.flagged(),
      deferDate: task.deferDate() ? task.deferDate().toISOString() : null,
      dueDate: task.dueDate() ? task.dueDate().toISOString() : null,
      completionDate: task.completionDate() ? task.completionDate().toISOString() : null,
      estimatedMinutes: task.estimatedMinutes() || null,
      inInbox: task.inInbox(),
      blocked: task.blocked(),
      tags: tags,
      projectName: projectName
    };
  } catch (e) {
    return { id: task.id(), name: task.name(), error: e.message };
  }
}

/**
 * Format project for JSON output
 */
function formatProject(project) {
  try {
    let folderName = null;
    try {
      const folder = project.folder();
      if (folder) folderName = folder.name();
    } catch {}

    let primaryTag = null;
    try {
      const tag = project.primaryTag();
      if (tag) primaryTag = tag.name();
    } catch {}

    return {
      id: project.id(),
      name: project.name(),
      note: project.note() || "",
      status: project.status(),
      completed: project.completed(),
      flagged: project.flagged(),
      sequential: project.sequential(),
      deferDate: project.deferDate() ? project.deferDate().toISOString() : null,
      dueDate: project.dueDate() ? project.dueDate().toISOString() : null,
      completionDate: project.completionDate() ? project.completionDate().toISOString() : null,
      lastReviewDate: project.lastReviewDate() ? project.lastReviewDate().toISOString() : null,
      nextReviewDate: project.nextReviewDate() ? project.nextReviewDate().toISOString() : null,
      taskCount: project.numberOfTasks(),
      availableTaskCount: project.numberOfAvailableTasks(),
      completedTaskCount: project.numberOfCompletedTasks(),
      folderName: folderName,
      primaryTag: primaryTag,
      singletonActionHolder: project.singletonActionHolder()
    };
  } catch (e) {
    return { id: project.id(), name: project.name(), error: e.message };
  }
}

/**
 * Format folder for JSON output
 */
function formatFolder(folder) {
  try {
    let containerName = null;
    try {
      const container = folder.container();
      if (container && container.name) containerName = container.name();
    } catch {}

    return {
      id: folder.id(),
      name: folder.name(),
      note: folder.note() || "",
      hidden: folder.hidden(),
      projectCount: folder.projects().length,
      folderCount: folder.folders().length,
      containerName: containerName
    };
  } catch (e) {
    return { id: folder.id(), name: folder.name(), error: e.message };
  }
}

/**
 * Format tag for JSON output
 */
function formatTag(tag) {
  try {
    let containerName = null;
    try {
      const container = tag.container();
      if (container && container.name) containerName = container.name();
    } catch {}

    return {
      id: tag.id(),
      name: tag.name(),
      allowsNextAction: tag.allowsNextAction(),
      hidden: tag.hidden(),
      taskCount: tag.availableTaskCount(),
      remainingTaskCount: tag.remainingTaskCount(),
      containerName: containerName
    };
  } catch (e) {
    return { id: tag.id(), name: tag.name(), error: e.message };
  }
}

/**
 * Find project by name or ID
 */
function findProject(doc, nameOrId) {
  // Try by ID first
  try {
    const projects = doc.flattenedProjects();
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].id() === nameOrId) {
        return projects[i];
      }
    }
  } catch {}

  // Try by name
  try {
    const projects = doc.flattenedProjects();
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].name() === nameOrId) {
        return projects[i];
      }
    }
  } catch {}

  return null;
}

/**
 * Find tag by name or ID
 */
function findTag(doc, nameOrId) {
  try {
    const tags = doc.flattenedTags();
    for (let i = 0; i < tags.length; i++) {
      if (tags[i].id() === nameOrId || tags[i].name() === nameOrId) {
        return tags[i];
      }
    }
  } catch {}
  return null;
}

/**
 * Find folder by name or ID
 */
function findFolder(doc, nameOrId) {
  try {
    const folders = doc.flattenedFolders();
    for (let i = 0; i < folders.length; i++) {
      if (folders[i].id() === nameOrId || folders[i].name() === nameOrId) {
        return folders[i];
      }
    }
  } catch {}
  return null;
}

/**
 * Find task by ID
 */
function findTask(doc, taskId) {
  try {
    const tasks = doc.flattenedTasks();
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id() === taskId) {
        return tasks[i];
      }
    }
  } catch {}
  return null;
}

/**
 * Parse natural date string
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const now = new Date();
  const lowerDate = dateStr.toLowerCase().trim();

  // Handle relative dates
  if (lowerDate === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
  }
  if (lowerDate === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  }
  if (lowerDate === "next week") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(17, 0, 0, 0);
    return d;
  }

  // Handle "+Nd" format (e.g., "+3d" = 3 days from now)
  const daysMatch = lowerDate.match(/^\+(\d+)d$/);
  if (daysMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(daysMatch[1], 10));
    d.setHours(17, 0, 0, 0);
    return d;
  }

  // Handle "+Nw" format (weeks)
  const weeksMatch = lowerDate.match(/^\+(\d+)w$/);
  if (weeksMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(weeksMatch[1], 10) * 7);
    d.setHours(17, 0, 0, 0);
    return d;
  }

  // Try ISO date
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch {}

  return null;
}
