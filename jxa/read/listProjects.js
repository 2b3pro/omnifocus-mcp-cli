// List projects
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const allProjects = doc.flattenedProjects();
    const projects = [];

    const limit = opts.limit || 100;
    let count = 0;

    for (let i = 0; i < allProjects.length && count < limit; i++) {
      const project = allProjects[i];

      // Filter by status
      const status = project.status();
      if (!opts.includeCompleted && status === "done status") continue;
      if (!opts.includeDropped && status === "dropped status") continue;
      if (!opts.includeOnHold && status === "on hold status") continue;

      // Filter by folder
      if (opts.folder) {
        try {
          const folder = project.folder();
          if (!folder || (folder.name() !== opts.folder && folder.id() !== opts.folder)) {
            continue;
          }
        } catch {
          continue;
        }
      }

      // Use brief format for faster listing, or full format
      if (opts.brief) {
        projects.push({
          id: project.id(),
          name: project.name(),
          status: project.status(),
          taskCount: project.numberOfTasks()
        });
      } else {
        projects.push(formatProject(project));
      }
      count++;
    }

    return JSON.stringify({
      success: true,
      projects: projects,
      totalCount: allProjects.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
