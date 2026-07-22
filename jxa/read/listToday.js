// List tasks due today or available today
//
// Bulk property fetch: one Apple Event per property for the whole collection
// rather than one per property per task. See formatTasksBulk in utils/helpers.js.
// Filtering uses effectiveDueDate/effectiveDeferDate (inherited from the
// containing project), which the output shape does not carry, so those two are
// fetched as their own bulk arrays.
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const limit = opts.limit || 100;
    const collection = doc.flattenedTasks;

    const rows = opts.brief
      ? formatTasksBriefBulk(collection)
      : formatTasksBulk(collection);

    const arr = (fn) => {
      try {
        const v = fn();
        if (!Array.isArray(v) || v.length !== rows.length) return null;
        return v;
      } catch {
        return null;
      }
    };
    const effDue = arr(() => collection.effectiveDueDate()) || new Array(rows.length).fill(null);
    const effDefer = arr(() => collection.effectiveDeferDate()) || new Array(rows.length).fill(null);

    const tasks = [];
    for (let i = 0; i < rows.length && tasks.length < limit; i++) {
      const row = rows[i];

      if (row.completed) continue;

      const dueDate = effDue[i] ? new Date(effDue[i]) : null;
      const deferDate = effDefer[i] ? new Date(effDefer[i]) : null;

      let include = false;

      // Due today or overdue
      if (dueDate && dueDate <= todayEnd) include = true;

      // Available today (defer date is today)
      if (deferDate && deferDate <= todayEnd && deferDate >= todayStart) include = true;

      // Flagged tasks are always relevant
      if (opts.includeFlagged && row.flagged) include = true;

      if (include) tasks.push(row);
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
