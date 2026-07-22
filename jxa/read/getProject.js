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

    // Get project tasks (bulk property fetch — see formatTasksBulk in helpers)
    const tasks = formatTasksBulk(project.tasks).slice(0, 50);

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
