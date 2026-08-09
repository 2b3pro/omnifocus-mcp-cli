// List flagged tasks
//
// Bulk property fetch: one Apple Event per property for the whole collection
// rather than one per property per task. See formatTasksBulk in utils/helpers.js.
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const collection = doc.flattenedTasks;
    const limit = opts.limit || 100;

    const rows = opts.brief
      ? formatTasksBriefBulk(collection)
      : formatTasksBulk(collection);

    // Match OmniFocus's Flagged perspective: inherited flags count, and tasks that
    // are only effectively completed/dropped (via their project) are excluded.
    const eff = effectiveFlagsBulk(collection);

    const tasks = [];
    for (let i = 0; i < rows.length && tasks.length < limit; i++) {
      if (eff) {
        if (!opts.includeCompleted && (eff.effCompleted[i] || eff.effDropped[i])) continue;
        if (!eff.effFlagged[i]) continue;
      } else {
        // Bulk fetch unavailable — fall back to own properties rather than returning nothing.
        if (!opts.includeCompleted && rows[i].completed) continue;
        if (!rows[i].flagged) continue;
      }
      tasks.push(rows[i]);
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
