// Open Quick Entry panel
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    // Parse dates before the panel opens: a date that doesn't parse fails the
    // command rather than entering a task without it.
    const due = opts.dueDate ? requireDate(opts.dueDate, "due") : null;
    const defer = opts.deferDate ? requireDate(opts.deferDate, "defer") : null;

    const qe = doc.quickEntry;

    // Open the quick entry panel
    qe.open();

    // If a task name is provided, create the task
    if (opts.name) {
      const task = app.make({
        new: "inbox task",
        at: qe.inboxTasks.end,
        withProperties: { name: opts.name }
      });

      if (opts.note) task.note = opts.note;
      if (due) task.dueDate = due;
      if (defer) task.deferDate = defer;
      if (opts.flagged) task.flagged = true;

      if (opts.autoSave) {
        qe.save();
      }

      return JSON.stringify({
        success: true,
        message: "Quick Entry opened with task",
        task: formatTask(task)
      });
    }

    return JSON.stringify({
      success: true,
      message: "Quick Entry panel opened"
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
