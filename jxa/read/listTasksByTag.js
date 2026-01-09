// List tasks with a specific tag
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

    // Get all tasks and filter by tag
    const allTasks = doc.flattenedTasks();
    const results = [];

    for (let i = 0; i < allTasks.length && results.length < limit; i++) {
      const task = allTasks[i];

      // Skip completed unless requested
      if (!includeCompleted && task.completed()) continue;

      // Check if task has this tag
      try {
        const taskTags = task.tags();
        let hasTag = false;
        for (let j = 0; j < taskTags.length; j++) {
          if (taskTags[j].id() === tag.id() || taskTags[j].name() === tag.name()) {
            hasTag = true;
            break;
          }
        }
        if (hasTag) {
          results.push(formatTask(task));
        }
      } catch {}
    }

    return JSON.stringify(results);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
