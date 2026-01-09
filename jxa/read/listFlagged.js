// List flagged tasks
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const allTasks = doc.flattenedTasks();
    const tasks = [];

    const limit = opts.limit || 100;
    let count = 0;

    for (let i = 0; i < allTasks.length && count < limit; i++) {
      const task = allTasks[i];

      // Skip completed unless requested
      if (!opts.includeCompleted && task.completed()) continue;

      // Only flagged tasks
      if (!task.flagged()) continue;

      // Brief mode returns minimal info (much faster due to reduced IPC overhead)
      if (opts.brief) {
        tasks.push({
          id: task.id(),
          name: task.name(),
          dueDate: task.effectiveDueDate() ? task.effectiveDueDate().toISOString() : null,
          flagged: true,
          completed: task.completed()
        });
      } else {
        tasks.push(formatTask(task));
      }
      count++;
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
