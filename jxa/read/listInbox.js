// List inbox tasks
//
// Bulk property fetch: one Apple Event per property for the whole collection
// rather than one per property per task. See formatTasksBulk in utils/helpers.js.
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const collection = doc.inboxTasks;
    const limit = opts.limit || 100;

    const rows = opts.brief
      ? formatTasksBriefBulk(collection)
      : formatTasksBulk(collection);

    const tasks = [];
    for (let i = 0; i < rows.length && tasks.length < limit; i++) {
      if (!opts.includeCompleted && rows[i].completed) continue;
      tasks.push(rows[i]);
    }

    return JSON.stringify({
      success: true,
      tasks: tasks,
      totalCount: rows.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
