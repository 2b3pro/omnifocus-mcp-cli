// List tasks in a project
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

    const projectTasks = project.flattenedTasks();
    const tasks = [];

    const limit = opts.limit || 100;
    let count = 0;

    for (let i = 0; i < projectTasks.length && count < limit; i++) {
      const task = projectTasks[i];

      // Skip completed unless requested
      if (!opts.includeCompleted && task.completed()) continue;

      tasks.push(formatTask(task));
      count++;
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
      totalCount: projectTasks.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
