// List tasks with a specific tag
//
// Bulk property fetch: one Apple Event per property for the whole collection
// rather than one per property per task. See formatTasksBulk in utils/helpers.js.
// NOTE: returns a bare ARRAY (not a wrapped object) — preserving the original
// contract, which callers depend on.
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const tagNameOrId = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!tagNameOrId) {
      return JSON.stringify({ success: false, error: "Tag name or ID is required" });
    }

    const tag = findTag(doc, tagNameOrId);
    if (!tag) {
      return JSON.stringify({ success: false, error: "Tag not found: " + tagNameOrId });
    }

    const limit = opts.limit || 100;
    const includeCompleted = opts.includeCompleted || false;

    const tagId = tag.id();
    const tagName = tag.name();

    const collection = doc.flattenedTasks;
    const rows = formatTasksBulk(collection);

    // Match on id OR name, as the per-task version did.
    let tagIds = null;
    try { tagIds = collection.tags.id(); } catch { tagIds = null; }
    if (tagIds && tagIds.length !== rows.length) tagIds = null;

    const results = [];
    for (let i = 0; i < rows.length && results.length < limit; i++) {
      const row = rows[i];

      if (!includeCompleted && row.completed) continue;

      const ids = tagIds ? tagIds[i] : null;
      const byId = Array.isArray(ids) && ids.indexOf(tagId) !== -1;
      const byName = Array.isArray(row.tags) && row.tags.indexOf(tagName) !== -1;
      if (!byId && !byName) continue;

      results.push(row);
    }

    return JSON.stringify(results);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
