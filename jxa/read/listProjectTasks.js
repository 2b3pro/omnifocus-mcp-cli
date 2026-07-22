// List tasks in a project
//
// Bulk property fetch: one Apple Event per property for the whole collection
// rather than one per property per task. See formatTasksBulk in utils/helpers.js.
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const projectId = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!projectId) {
      return JSON.stringify({ success: false, error: "Project ID or name is required" });
    }

    const project = findProject(doc, projectId);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + projectId });
    }

    const collection = project.flattenedTasks;
    const limit = opts.limit || 100;

    const rows = formatTasksBulk(collection);

    const tasks = [];
    for (let i = 0; i < rows.length && tasks.length < limit; i++) {
      if (!opts.includeCompleted && rows[i].completed) continue;
      tasks.push(rows[i]);
    }

    return JSON.stringify({
      success: true,
      tasks: tasks,
      project: {
        id: project.id(),
        name: project.name(),
        sequential: project.sequential(),
        singletonActionHolder: project.singletonActionHolder()
      },
      totalCount: rows.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
