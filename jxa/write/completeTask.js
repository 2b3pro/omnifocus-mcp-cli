// Mark task(s) as complete
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const taskIds = getArg(4, "").split(",").filter(id => id.trim());
    const opts = parseJsonArg(5, {});

    if (taskIds.length === 0) {
      return JSON.stringify({ success: false, error: "Task ID(s) required" });
    }

    // Optional backdating. Accepts the same forms as every other date flag
    // ("today", "-2d", ISO); an unparseable value is an error, not a silent now().
    let completionDate = null;
    if (opts.completionDate) {
      completionDate = parseDate(opts.completionDate);
      if (!completionDate) {
        return JSON.stringify({ success: false, error: "Invalid completion date: " + opts.completionDate });
      }
    }

    const completed = [];
    const errors = [];
    const wouldComplete = [];

    for (const taskId of taskIds) {
      const id = taskId.trim();
      const task = findTask(doc, id);

      if (!task) {
        errors.push({ id: id, error: "Task not found" });
        continue;
      }

      if (opts.dryRun) {
        wouldComplete.push({
          id: task.id(),
          name: task.name(),
          alreadyCompleted: task.completed(),
          completionDate: completionDate ? completionDate.toISOString() : null
        });
        continue;
      }

      try {
        // markComplete accepts an explicit completion date, so work finished
        // earlier can be logged with the date it actually happened.
        if (completionDate) app.markComplete(task, { completionDate: completionDate });
        else app.markComplete(task);
        completed.push({
          id: task.id(),
          name: task.name(),
          completionDate: task.completionDate() ? task.completionDate().toISOString() : null
        });
      } catch (e) {
        errors.push({ id: id, error: e.message });
      }
    }

    if (opts.dryRun) {
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: `DRY RUN: ${wouldComplete.length} task(s) would be completed`,
        wouldComplete: wouldComplete,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return JSON.stringify({
      success: errors.length === 0,
      completed: completed,
      errors: errors.length > 0 ? errors : undefined,
      message: `${completed.length} task(s) completed`
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
