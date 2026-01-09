// Search tasks by text with advanced filters
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const query = getArg(4, "");
    const opts = parseJsonArg(5, {});

    // Query can be empty if using filters only
    const queryLower = query ? query.toLowerCase() : "";

    const allTasks = doc.flattenedTasks();
    const tasks = [];

    const limit = opts.limit || 50;
    let count = 0;

    // Pre-resolve filters
    let targetProject = null;
    if (opts.project) {
      targetProject = findProject(doc, opts.project);
      if (!targetProject) {
        return JSON.stringify({ success: false, error: "Project not found: " + opts.project });
      }
    }

    let targetTag = null;
    if (opts.tag) {
      targetTag = findTag(doc, opts.tag);
      if (!targetTag) {
        return JSON.stringify({ success: false, error: "Tag not found: " + opts.tag });
      }
    }

    // Parse date filters
    let dueBefore = opts.dueBefore ? parseDate(opts.dueBefore) : null;
    let dueAfter = opts.dueAfter ? parseDate(opts.dueAfter) : null;
    let deferBefore = opts.deferBefore ? parseDate(opts.deferBefore) : null;
    let deferAfter = opts.deferAfter ? parseDate(opts.deferAfter) : null;

    for (let i = 0; i < allTasks.length && count < limit; i++) {
      const task = allTasks[i];

      // Skip completed unless requested
      if (!opts.includeCompleted && task.completed()) continue;

      // Flagged filter
      if (opts.flagged && !task.flagged()) continue;

      // Available filter (not blocked, not completed, defer date passed)
      if (opts.available) {
        if (task.blocked()) continue;
        const deferDate = task.deferDate();
        if (deferDate && deferDate > new Date()) continue;
      }

      // Project filter
      if (targetProject) {
        try {
          const taskProject = task.containingProject();
          if (!taskProject || taskProject.id() !== targetProject.id()) continue;
        } catch {
          continue;
        }
      }

      // Tag filter
      if (targetTag) {
        let hasTag = false;
        try {
          const taskTags = task.tags();
          for (let j = 0; j < taskTags.length; j++) {
            if (taskTags[j].id() === targetTag.id()) {
              hasTag = true;
              break;
            }
          }
        } catch {}
        if (!hasTag) continue;
      }

      // Due date filters
      if (dueBefore || dueAfter) {
        const taskDue = task.dueDate();
        if (!taskDue) {
          if (opts.requireDue) continue; // Skip tasks without due date if requireDue is set
        } else {
          if (dueBefore && taskDue > dueBefore) continue;
          if (dueAfter && taskDue < dueAfter) continue;
        }
      }

      // Defer date filters
      if (deferBefore || deferAfter) {
        const taskDefer = task.deferDate();
        if (!taskDefer) continue;
        if (deferBefore && taskDefer > deferBefore) continue;
        if (deferAfter && taskDefer < deferAfter) continue;
      }

      // Text search (if query provided)
      if (queryLower) {
        const name = task.name().toLowerCase();
        const note = (task.note() || "").toLowerCase();
        if (!name.includes(queryLower) && !note.includes(queryLower)) continue;
      }

      tasks.push(formatTask(task));
      count++;
    }

    return JSON.stringify({
      success: true,
      tasks: tasks,
      query: query || "(filter only)",
      filters: {
        project: opts.project || null,
        tag: opts.tag || null,
        flagged: opts.flagged || false,
        available: opts.available || false,
        dueBefore: opts.dueBefore || null,
        dueAfter: opts.dueAfter || null
      },
      totalCount: tasks.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
