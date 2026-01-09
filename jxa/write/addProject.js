// Add a new project
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const name = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!name) {
      return JSON.stringify({ success: false, error: "Project name is required" });
    }

    // Dry run mode
    if (opts.dryRun) {
      const preview = {
        name: name,
        folder: opts.folder || "(root)",
        note: opts.note || null,
        dueDate: opts.dueDate || null,
        deferDate: opts.deferDate || null,
        flagged: opts.flagged || false,
        tag: opts.tag || null,
        sequential: opts.sequential || false,
        singleActions: opts.singleActions || false,
        tasks: opts.tasks || []
      };
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: `DRY RUN: Project would be created with ${(opts.tasks || []).length} task(s)`,
        preview: preview
      });
    }

    let project;

    // Create project object
    project = app.Project({ name: name });

    if (opts.folder) {
      // Add to specific folder
      const folder = findFolder(doc, opts.folder);
      if (!folder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + opts.folder });
      }
      folder.projects.push(project);
    } else {
      // Add to document root
      doc.projects.push(project);
    }

    // Set optional properties
    if (opts.note) {
      project.note = opts.note;
    }

    if (opts.dueDate) {
      const due = parseDate(opts.dueDate);
      if (due) project.dueDate = due;
    }

    if (opts.deferDate) {
      const defer = parseDate(opts.deferDate);
      if (defer) project.deferDate = defer;
    }

    if (opts.flagged) {
      project.flagged = true;
    }

    if (opts.sequential !== undefined) {
      project.sequential = opts.sequential;
    }

    if (opts.singleActions) {
      project.singletonActionHolder = true;
    }

    // Add tag
    if (opts.tag) {
      const tag = findTag(doc, opts.tag);
      if (tag) {
        project.primaryTag = tag;
      }
    }

    // Add tasks to project
    const createdTasks = [];
    if (opts.tasks && Array.isArray(opts.tasks)) {
      for (const taskName of opts.tasks) {
        if (!taskName || typeof taskName !== 'string') continue;

        const task = app.Task({ name: taskName.trim() });
        project.rootTask.tasks.push(task);
        createdTasks.push({
          id: task.id(),
          name: task.name()
        });
      }
    }

    // Return minimal info (formatProject is slow due to IPC overhead)
    const result = {
      success: true,
      message: createdTasks.length > 0
        ? `Project created with ${createdTasks.length} task(s)`
        : "Project created successfully",
      project: {
        id: project.id(),
        name: project.name(),
        status: project.status(),
        flagged: project.flagged(),
        sequential: project.sequential()
      }
    };

    if (createdTasks.length > 0) {
      result.tasks = createdTasks;
    }

    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
