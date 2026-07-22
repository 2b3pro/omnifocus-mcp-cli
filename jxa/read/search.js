// Search tasks by text with advanced filters
//
// PERFORMANCE: this used to walk doc.flattenedTasks() reading properties off
// one task at a time. In JXA every such read is an Apple Event round-trip
// (~17ms against OmniFocus 4.8.12), and the loop touched up to 8 properties per
// task for filtering plus 14 more in formatTask — tens of thousands of round
// trips, which is why `of search` took ~30s and timed out the test suite.
//
// Now: every property is fetched once for the whole collection (one Apple Event
// each, ~10-130ms regardless of task count), then all filtering happens over
// plain JS arrays with zero IPC. Filter semantics are unchanged, including
// comparing projects and tags by ID rather than name.
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const query = getArg(4, "");
    const opts = parseJsonArg(5, {});

    const queryLower = query ? query.toLowerCase() : "";
    const limit = opts.limit || 50;

    // Pre-resolve filters (unchanged)
    let targetProject = null;
    if (opts.project) {
      targetProject = findProject(doc, opts.project);
      if (!targetProject) {
        return JSON.stringify({ success: false, error: "Project not found: " + opts.project });
      }
    }

    let targetTag = null;
    if (opts.tag) {
      targetTag = findTag(doc, opts.tag);
      if (!targetTag) {
        return JSON.stringify({ success: false, error: "Tag not found: " + opts.tag });
      }
    }

    const dueBefore = opts.dueBefore ? parseDate(opts.dueBefore) : null;
    const dueAfter = opts.dueAfter ? parseDate(opts.dueAfter) : null;
    const deferBefore = opts.deferBefore ? parseDate(opts.deferBefore) : null;
    const deferAfter = opts.deferAfter ? parseDate(opts.deferAfter) : null;

    const targetProjectId = targetProject ? targetProject.id() : null;
    const targetTagId = targetTag ? targetTag.id() : null;

    // --- the only IPC in this script ---
    const collection = doc.flattenedTasks;
    const formatted = formatTasksBulk(collection);

    // ID arrays, fetched only when a filter actually needs them
    let projectIds = null;
    if (targetProjectId) {
      try { projectIds = collection.containingProject.id(); } catch { projectIds = null; }
    }
    let tagIds = null;
    if (targetTagId) {
      try { tagIds = collection.tags.id(); } catch { tagIds = null; }
    }
    // --- end IPC ---

    const now = new Date();
    const tasks = [];

    for (let i = 0; i < formatted.length && tasks.length < limit; i++) {
      const t = formatted[i];

      if (!opts.includeCompleted && t.completed) continue;

      if (opts.flagged && !t.flagged) continue;

      if (opts.available) {
        if (t.blocked) continue;
        if (t.deferDate && new Date(t.deferDate) > now) continue;
      }

      if (targetProjectId) {
        if (!projectIds || projectIds[i] !== targetProjectId) continue;
      }

      if (targetTagId) {
        const ids = tagIds ? tagIds[i] : null;
        if (!Array.isArray(ids) || ids.indexOf(targetTagId) === -1) continue;
      }

      if (dueBefore || dueAfter) {
        if (!t.dueDate) {
          if (opts.requireDue) continue;
        } else {
          const d = new Date(t.dueDate);
          if (dueBefore && d > dueBefore) continue;
          if (dueAfter && d < dueAfter) continue;
        }
      }

      if (deferBefore || deferAfter) {
        if (!t.deferDate) continue;
        const d = new Date(t.deferDate);
        if (deferBefore && d > deferBefore) continue;
        if (deferAfter && d < deferAfter) continue;
      }

      if (queryLower) {
        const name = (t.name || "").toLowerCase();
        const note = (t.note || "").toLowerCase();
        if (name.indexOf(queryLower) === -1 && note.indexOf(queryLower) === -1) continue;
      }

      tasks.push(t);
    }

    return JSON.stringify({
      success: true,
      tasks: tasks,
      query: query || "(filter only)",
      filters: {
        project: opts.project || null,
        tag: opts.tag || null,
        flagged: opts.flagged || false,
        available: opts.available || false,
        dueBefore: opts.dueBefore || null,
        dueAfter: opts.dueAfter || null
      },
      totalCount: tasks.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
