// Batch add projects with tasks from outline
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    if (!opts.projects || !Array.isArray(opts.projects) || opts.projects.length === 0) {
      return JSON.stringify({ success: false, error: "No projects provided" });
    }

    // Dry run mode
    if (opts.dryRun) {
      const totalTasks = opts.projects.reduce((sum, p) => sum + (p.tasks || []).length, 0);
      const folderInfo = opts.createFolder
        ? `${opts.createFolder} (new)`
        : (opts.folder || "(root)");
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: `DRY RUN: Would create ${opts.projects.length} project(s) with ${totalTasks} task(s)`,
        preview: {
          folder: folderInfo,
          createFolder: opts.createFolder || null,
          sequential: opts.sequential || false,
          projects: opts.projects
        }
      });
    }

    // Create or find folder
    let targetFolder = null;
    let createdFolder = null;

    if (opts.createFolder) {
      // Create new folder
      targetFolder = app.make({
        new: "folder",
        at: doc.folders.end,
        withProperties: { name: opts.createFolder }
      });
      createdFolder = {
        id: targetFolder.id(),
        name: targetFolder.name()
      };
    } else if (opts.folder) {
      // Use existing folder
      targetFolder = findFolder(doc, opts.folder);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + opts.folder });
      }
    }

    const createdProjects = [];
    const errors = [];

    for (const projectData of opts.projects) {
      try {
        // Create project
        let project;
        if (targetFolder) {
          project = app.Project({ name: projectData.name });
          targetFolder.projects.push(project);
        } else {
          project = app.make({
            new: "project",
            at: doc.projects.end,
            withProperties: { name: projectData.name }
          });
        }

        // Set sequential if requested
        if (opts.sequential) {
          project.sequential = true;
        }

        // Create tasks under the project
        const createdTasks = [];
        if (projectData.tasks && Array.isArray(projectData.tasks)) {
          for (const taskName of projectData.tasks) {
            if (!taskName) continue;

            const task = app.Task({ name: taskName });
            project.rootTask.tasks.push(task);
            createdTasks.push({
              id: task.id(),
              name: task.name()
            });
          }
        }

        createdProjects.push({
          id: project.id(),
          name: project.name(),
          taskCount: createdTasks.length,
          tasks: createdTasks
        });
      } catch (e) {
        errors.push({ project: projectData.name, error: e.message });
      }
    }

    const totalTasks = createdProjects.reduce((sum, p) => sum + p.taskCount, 0);

    const result = {
      success: errors.length === 0,
      message: createdFolder
        ? `Created folder "${createdFolder.name}" with ${createdProjects.length} project(s) and ${totalTasks} task(s)`
        : `Created ${createdProjects.length} project(s) with ${totalTasks} task(s)`,
      projects: createdProjects,
      errors: errors.length > 0 ? errors : undefined
    };

    if (createdFolder) {
      result.folder = createdFolder;
    }

    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
