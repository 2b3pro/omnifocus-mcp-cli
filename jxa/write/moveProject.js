// Move a project to a different folder
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const projectNameOrId = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!projectNameOrId) {
      return JSON.stringify({ success: false, error: "Project name or ID is required" });
    }

    const project = findProject(doc, projectNameOrId);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + projectNameOrId });
    }

    // Dry run mode
    if (opts.dryRun) {
      const currentFolder = project.folder() ? project.folder().name() : "(root)";
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: "DRY RUN: Project would be moved",
        preview: {
          project: project.name(),
          from: currentFolder,
          to: opts.folder || "(root)"
        }
      });
    }

    const oldFolder = project.folder() ? project.folder().name() : "(root)";

    if (opts.folder) {
      // Move to specific folder
      const targetFolder = findFolder(doc, opts.folder);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: "Target folder not found: " + opts.folder });
      }
      // Use JXA move with sections specifier
      app.move(project, { to: targetFolder.sections.end });
    } else {
      // Move to root (no folder)
      app.move(project, { to: doc.sections.end });
    }

    // Re-fetch project to get updated folder info
    const updatedProject = findProject(doc, projectNameOrId);
    const newFolder = updatedProject && updatedProject.folder() ? updatedProject.folder().name() : "(root)";

    return JSON.stringify({
      success: true,
      message: `Project moved from "${oldFolder}" to "${newFolder}"`,
      project: formatProject(updatedProject || project)
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
