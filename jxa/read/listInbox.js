// List inbox tasks
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const inboxTasks = doc.inboxTasks();
    const tasks = [];

    const limit = opts.limit || 100;
    let count = 0;

    for (let i = 0; i < inboxTasks.length && count < limit; i++) {
      const task = inboxTasks[i];

      // Skip completed unless requested
      if (!opts.includeCompleted && task.completed()) continue;

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

    return JSON.stringify({
      success: true,
      tasks: tasks,
      totalCount: inboxTasks.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
