// Mark task(s) as dropped
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const taskIds = getArg(4, "").split(",").filter(id => id.trim());
    const opts = parseJsonArg(5, {});

    if (taskIds.length === 0) {
      return JSON.stringify({ success: false, error: "Task ID(s) required" });
    }

    const dropped = [];
    const errors = [];
    const wouldDrop = [];

    for (const taskId of taskIds) {
      const id = taskId.trim();
      const task = findTask(doc, id);

      if (!task) {
        errors.push({ id: id, error: "Task not found" });
        continue;
      }

      if (opts.dryRun) {
        wouldDrop.push({
          id: task.id(),
          name: task.name()
        });
        continue;
      }

      try {
        app.markDropped(task);
        dropped.push({
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
        message: `DRY RUN: ${wouldDrop.length} task(s) would be dropped`,
        wouldDrop: wouldDrop,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return JSON.stringify({
      success: errors.length === 0,
      dropped: dropped,
      errors: errors.length > 0 ? errors : undefined,
      message: `${dropped.length} task(s) dropped`
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
