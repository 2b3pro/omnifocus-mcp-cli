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
/**
 * Format a whole task COLLECTION for JSON output — bulk property fetch.
 *
 * Why this exists: in JXA every property read on a single object is one Apple
 * Event round-trip, measured at ~17ms against OmniFocus 4.8.12. formatTask()
 * reads 14 properties, so formatting N tasks one at a time costs N * 14 * 17ms
 * — about 156 seconds for a 766-task database. Asking the COLLECTION for a
 * property (`tasks.name()`) is a single Apple Event returning an array, ~15-130ms
 * regardless of N. Same data, ~380x less wall clock.
 *
 * Takes a JXA collection (e.g. doc.flattenedTasks, or the result of .whose()),
 * NOT an array of task objects — the speedup comes from the collection itself
 * resolving each property in one call. Returns objects identical in shape to
 * formatTask(), so callers and their consumers are unaffected.
 *
 * Each property is fetched independently: a property unsupported by the running
 * OmniFocus (plannedDate on older versions) degrades to nulls for every row
 * rather than failing the batch.
 */
function formatTasksBulk(collection) {
  const col = (fn, fallback) => {
    try {
      const v = fn();
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };

  const ids = col(() => collection.id());
  if (!ids) return [];   // can't identify rows; caller should fall back
  const n = ids.length;
  const blank = () => new Array(n).fill(null);

  const names = col(() => collection.name()) || blank();
  const notes = col(() => collection.note()) || blank();
  const completed = col(() => collection.completed()) || blank();
  const flagged = col(() => collection.flagged()) || blank();
  const defer = col(() => collection.deferDate()) || blank();
  const planned = col(() => collection.plannedDate()) || blank();
  const due = col(() => collection.dueDate()) || blank();
  const completion = col(() => collection.completionDate()) || blank();
  const estimates = col(() => collection.estimatedMinutes()) || blank();
  const inInbox = col(() => collection.inInbox()) || blank();
  const blocked = col(() => collection.blocked()) || blank();
  const projNames = col(() => collection.containingProject.name()) || blank();
  const tagNames = col(() => collection.tags.name()) || blank();

  const iso = (d) => (d ? new Date(d).toISOString() : null);

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      id: ids[i],
      name: names[i],
      note: notes[i] || "",
      completed: completed[i],
      flagged: flagged[i],
      deferDate: iso(defer[i]),
      plannedDate: iso(planned[i]),
      dueDate: iso(due[i]),
      completionDate: iso(completion[i]),
      estimatedMinutes: estimates[i] || null,
      inInbox: inInbox[i],
      blocked: blocked[i],
      tags: Array.isArray(tagNames[i]) ? tagNames[i] : [],
      projectName: projNames[i] === undefined ? null : projNames[i]
    };
  }
  return out;
}

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

    // Planned date requires a newer OmniFocus than defer/due do. Probe it
    // defensively so an older app degrades to null instead of throwing the
    // whole formatter into its catch and losing every other field.
    let plannedDate = null;
    try {
      const p = task.plannedDate();   // single IPC round-trip; formatTask runs per search result
      plannedDate = p ? p.toISOString() : null;
    } catch {}

    return {
      id: task.id(),
      name: task.name(),
      note: task.note() || "",
      completed: task.completed(),
      flagged: task.flagged(),
      deferDate: task.deferDate() ? task.deferDate().toISOString() : null,
      plannedDate: plannedDate,
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

    // Both are version-dependent; degrade to null rather than throwing the
    // formatter into its catch (see formatTask).
    let plannedDate = null;
    try {
      const p = project.plannedDate();
      plannedDate = p ? p.toISOString() : null;
    } catch {}

    let reviewInterval = null;
    try {
      const ri = project.reviewInterval();
      if (ri) reviewInterval = { unit: ri.unit, steps: ri.steps, fixed: ri.fixed };
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
      plannedDate: plannedDate,
      dueDate: project.dueDate() ? project.dueDate().toISOString() : null,
      completionDate: project.completionDate() ? project.completionDate().toISOString() : null,
      lastReviewDate: project.lastReviewDate() ? project.lastReviewDate().toISOString() : null,
      nextReviewDate: project.nextReviewDate() ? project.nextReviewDate().toISOString() : null,
      reviewInterval: reviewInterval,
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
