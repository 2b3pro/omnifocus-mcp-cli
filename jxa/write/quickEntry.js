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
      // app.make({ new: "inbox task", at: qe.inboxTasks.end }) fails with
      // "Can't make class."; pushing onto the panel's own list works.
      const task = app.InboxTask({ name: opts.name });
      qe.inboxTasks.push(task);

      if (opts.note) task.note = opts.note;
      if (due) task.dueDate = due;
      if (defer) task.deferDate = defer;
      if (opts.flagged) task.flagged = true;

      // Saving moves the task from the panel to the inbox, after which the
      // panel's reference to it no longer resolves. Its id does not change.
      const taskId = task.id();
      if (opts.autoSave) {
        qe.save();
      }
      const entered = opts.autoSave ? findTask(doc, taskId) : task;

      return JSON.stringify({
        success: true,
        message: "Quick Entry opened with task",
        task: entered ? formatTask(entered) : { id: taskId, name: opts.name }
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
