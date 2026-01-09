// List tasks due today or available today
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const allTasks = doc.flattenedTasks();
    const tasks = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const limit = opts.limit || 100;
    let count = 0;

    for (let i = 0; i < allTasks.length && count < limit; i++) {
      const task = allTasks[i];

      // Skip completed
      if (task.completed()) continue;

      // Check if due today
      const dueDate = task.effectiveDueDate();
      const deferDate = task.effectiveDeferDate();

      let include = false;

      // Due today or overdue
      if (dueDate && dueDate <= todayEnd) {
        include = true;
      }

      // Available today (defer date is today or past)
      if (deferDate && deferDate <= todayEnd && deferDate >= todayStart) {
        include = true;
      }

      // Flagged tasks are always relevant
      if (opts.includeFlagged && task.flagged()) {
        include = true;
      }

      if (include) {
        // Brief mode returns minimal info (much faster due to reduced IPC overhead)
        if (opts.brief) {
          tasks.push({
            id: task.id(),
            name: task.name(),
            dueDate: task.effectiveDueDate() ? task.effectiveDueDate().toISOString() : null,
            flagged: task.flagged(),
            completed: task.completed()
          });
        } else {
          tasks.push(formatTask(task));
        }
        count++;
      }
    }

    return JSON.stringify({
      success: true,
      tasks: tasks,
      totalCount: tasks.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
