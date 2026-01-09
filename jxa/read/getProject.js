// Get project details
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const projectId = getArg(4, "");

    if (!projectId) {
      return JSON.stringify({ success: false, error: "Project ID or name is required" });
    }

    const project = findProject(doc, projectId);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + projectId });
    }

    // Get project tasks
    const projectTasks = project.tasks();
    const tasks = [];
    for (let i = 0; i < projectTasks.length && i < 50; i++) {
      tasks.push(formatTask(projectTasks[i]));
    }

    const projectData = formatProject(project);
    projectData.tasks = tasks;

    return JSON.stringify({
      success: true,
      project: projectData
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
