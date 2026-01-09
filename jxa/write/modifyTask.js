// Modify an existing task
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const taskId = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!taskId) {
      return JSON.stringify({ success: false, error: "Task ID is required" });
    }

    const task = findTask(doc, taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + taskId });
    }

    // Dry run mode
    if (opts.dryRun) {
      const current = formatTask(task);
      const changes = {};
      if (opts.name !== undefined) changes.name = { from: current.name, to: opts.name };
      if (opts.note !== undefined) changes.note = { from: current.note, to: opts.note };
      if (opts.dueDate !== undefined) changes.dueDate = { from: current.dueDate, to: opts.dueDate };
      if (opts.deferDate !== undefined) changes.deferDate = { from: current.deferDate, to: opts.deferDate };
      if (opts.flagged !== undefined) changes.flagged = { from: current.flagged, to: opts.flagged };
      if (opts.tag !== undefined) changes.tag = { to: opts.tag };
      if (opts.project !== undefined) changes.project = { to: opts.project };
      if (opts.estimatedMinutes !== undefined) changes.estimatedMinutes = { from: current.estimatedMinutes, to: opts.estimatedMinutes };

      return JSON.stringify({
        success: true,
        dryRun: true,
        message: "DRY RUN: Task would be modified",
        task: current,
        changes: changes
      });
    }

    // Apply modifications
    if (opts.name !== undefined) {
      task.name = opts.name;
    }

    if (opts.note !== undefined) {
      task.note = opts.note;
    }

    if (opts.dueDate !== undefined) {
      if (opts.dueDate === null || opts.dueDate === "") {
        task.dueDate = null;
      } else {
        const due = parseDate(opts.dueDate);
        if (due) task.dueDate = due;
      }
    }

    // Relative due date adjustment (e.g., "+3d" adds 3 days to existing)
    if (opts.dueBy) {
      const current = task.dueDate() || new Date();
      const match = opts.dueBy.match(/^([+-]?\d+)([dwm])$/);
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        const newDate = new Date(current);
        if (unit === 'd') newDate.setDate(newDate.getDate() + amount);
        else if (unit === 'w') newDate.setDate(newDate.getDate() + amount * 7);
        else if (unit === 'm') newDate.setMonth(newDate.getMonth() + amount);
        task.dueDate = newDate;
      }
    }

    if (opts.deferDate !== undefined) {
      if (opts.deferDate === null || opts.deferDate === "") {
        task.deferDate = null;
      } else {
        const defer = parseDate(opts.deferDate);
        if (defer) task.deferDate = defer;
      }
    }

    // Relative defer date adjustment
    if (opts.deferBy) {
      const current = task.deferDate() || new Date();
      const match = opts.deferBy.match(/^([+-]?\d+)([dwm])$/);
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        const newDate = new Date(current);
        if (unit === 'd') newDate.setDate(newDate.getDate() + amount);
        else if (unit === 'w') newDate.setDate(newDate.getDate() + amount * 7);
        else if (unit === 'm') newDate.setMonth(newDate.getMonth() + amount);
        task.deferDate = newDate;
      }
    }

    if (opts.flagged !== undefined) {
      task.flagged = opts.flagged;
    }

    if (opts.estimatedMinutes !== undefined) {
      task.estimatedMinutes = opts.estimatedMinutes ? parseInt(opts.estimatedMinutes, 10) : null;
    }

    // Set project
    if (opts.project !== undefined) {
      if (opts.project === null || opts.project === "") {
        // Move to inbox - this is complex, skip for now
      } else {
        const project = findProject(doc, opts.project);
        if (project) {
          app.move(task, { to: project.rootTask.tasks.end });
        }
      }
    }

    // Set primary tag
    if (opts.tag !== undefined) {
      if (opts.tag === null || opts.tag === "") {
        task.primaryTag = null;
      } else {
        const tag = findTag(doc, opts.tag);
        if (tag) task.primaryTag = tag;
      }
    }

    return JSON.stringify({
      success: true,
      message: "Task updated successfully",
      task: formatTask(task)
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
