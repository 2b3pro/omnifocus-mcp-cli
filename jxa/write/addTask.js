// Add a new task (single or bulk)
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const name = getArg(4, "");
    const opts = parseJsonArg(5, {});

    // Handle bulk mode
    if (opts.bulk && Array.isArray(opts.bulk) && opts.bulk.length > 0) {
      return handleBulk(app, doc, opts);
    }

    // Single task mode
    if (!name) {
      return JSON.stringify({ success: false, error: "Task name is required" });
    }

    // Dry run mode - just return what would be created
    if (opts.dryRun) {
      const preview = {
        name: name,
        project: opts.project || "(inbox)",
        note: opts.note || null,
        dueDate: opts.dueDate || null,
        deferDate: opts.deferDate || null,
        flagged: opts.flagged || false,
        tag: opts.tag || null,
        tags: opts.tags || null,
        estimatedMinutes: opts.estimatedMinutes || null
      };
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: "DRY RUN: Task would be created",
        preview: preview
      });
    }

    const task = createTask(app, doc, name, opts);
    // Return minimal info at top level for backward compatibility (formatTask is slow due to IPC overhead)
    const taskId = task.id();
    const taskName = task.name();
    const taskFlagged = task.flagged();
    const taskCompleted = task.completed();
    // Optionally read dates if they were set (few extra IPC calls but needed by tests)
    const taskDueDate = opts.dueDate ? (task.dueDate() ? task.dueDate().toISOString() : null) : undefined;
    const taskDeferDate = opts.deferDate ? (task.deferDate() ? task.deferDate().toISOString() : null) : undefined;

    // Return both flat properties (for some tests) and nested task object (for other tests)
    const taskObj = {
      id: taskId,
      name: taskName,
      flagged: taskFlagged,
      completed: taskCompleted,
      dueDate: taskDueDate,
      deferDate: taskDeferDate
    };

    return JSON.stringify({
      success: true,
      message: "Task created successfully",
      // Flat properties for backward compatibility
      id: taskId,
      name: taskName,
      flagged: taskFlagged,
      completed: taskCompleted,
      dueDate: taskDueDate,
      deferDate: taskDeferDate,
      // Nested task object for other tests
      task: taskObj
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }

  // Helper: Create a single task with options
  function createTask(app, doc, taskName, opts) {
    let task;

    // Create task object
    task = app.InboxTask({ name: taskName });

    if (opts.project) {
      // Add to specific project - need to use regular Task, not InboxTask
      const project = findProject(doc, opts.project);
      if (!project) {
        throw new Error("Project not found: " + opts.project);
      }

      task = app.Task({ name: taskName });
      project.rootTask.tasks.push(task);
    } else {
      // Add to inbox
      doc.inboxTasks.push(task);
    }

    // Set optional properties
    if (opts.note) {
      task.note = opts.note;
    }

    if (opts.dueDate) {
      const due = parseDate(opts.dueDate);
      if (due) task.dueDate = due;
    }

    if (opts.deferDate) {
      const defer = parseDate(opts.deferDate);
      if (defer) task.deferDate = defer;
    }

    if (opts.flagged) {
      task.flagged = true;
    }

    if (opts.estimatedMinutes) {
      task.estimatedMinutes = parseInt(opts.estimatedMinutes, 10);
    }

    // Add tags
    if (opts.tags && Array.isArray(opts.tags)) {
      for (const tagName of opts.tags) {
        const tag = findTag(doc, tagName);
        if (tag) {
          app.add(tag, { to: task.tags });
        }
      }
    }

    // Add single tag
    if (opts.tag) {
      const tag = findTag(doc, opts.tag);
      if (tag) {
        task.primaryTag = tag;
      }
    }

    return task;
  }

  // Helper: Handle bulk task creation
  function handleBulk(app, doc, opts) {
    const taskNames = opts.bulk;

    // Dry run mode
    if (opts.dryRun) {
      const preview = {
        tasks: taskNames,
        project: opts.project || "(inbox)",
        dueDate: opts.dueDate || null,
        deferDate: opts.deferDate || null,
        flagged: opts.flagged || false,
        tag: opts.tag || null,
        tags: opts.tags || null
      };
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: `DRY RUN: ${taskNames.length} task(s) would be created`,
        preview: preview
      });
    }

    const created = [];
    const errors = [];

    for (const taskName of taskNames) {
      if (!taskName || typeof taskName !== 'string') continue;

      try {
        const task = createTask(app, doc, taskName.trim(), opts);
        created.push({
          id: task.id(),
          name: task.name()
        });
      } catch (e) {
        errors.push({ name: taskName, error: e.message });
      }
    }

    return JSON.stringify({
      success: errors.length === 0,
      message: `${created.length} task(s) created`,
      tasks: created,
      errors: errors.length > 0 ? errors : undefined
    });
  }
})();
