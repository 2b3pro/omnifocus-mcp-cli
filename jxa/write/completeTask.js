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
          alreadyCompleted: task.completed()
        });
        continue;
      }

      try {
        app.markComplete(task);
        completed.push({
          id: task.id(),
          name: task.name()
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
