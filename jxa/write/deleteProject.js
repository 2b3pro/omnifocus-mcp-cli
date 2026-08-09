// Delete project(s)
//
// SAFETY: deleting a project in OmniFocus takes every task inside it, including
// completed ones, and that is not recoverable through this CLI. So a project
// holding any tasks is REFUSED unless --force is given, and the refusal reports
// exactly what would be lost.
//
// This exists because `project drop` only sets status to dropped — the project
// and its tasks stay in the database forever. Dropping is a workflow state, not
// a removal, and using it as one is how test data accumulates.
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    // A JSON array, not a comma-joined string: project NAMES may contain commas.
    const projectIds = parseJsonArg(4, []).filter(x => x && String(x).trim());
    const opts = parseJsonArg(5, {});

    if (projectIds.length === 0) {
      return JSON.stringify({ success: false, error: "Project name(s) or ID(s) required" });
    }

    const deleted = [];
    const errors = [];
    const wouldDelete = [];
    const refused = [];

    const survey = (project) => {
      let tasks = 0, remaining = 0;
      try { tasks = project.flattenedTasks().length; } catch {}
      try {
        const ts = project.flattenedTasks();
        for (let i = 0; i < ts.length; i++) {
          try { if (!ts[i].completed()) remaining++; } catch {}
        }
      } catch {}
      return { tasks: tasks, remaining: remaining };
    };

    for (const raw of projectIds) {
      const nameOrId = String(raw).trim();
      const project = findProject(doc, nameOrId);

      if (!project) {
        errors.push({ id: nameOrId, error: "Project not found" });
        continue;
      }

      let name, id, contents;
      try {
        name = project.name();
        id = project.id();
        contents = survey(project);
      } catch (e) {
        errors.push({ id: nameOrId, error: "Could not read project: " + e.message });
        continue;
      }

      const isEmpty = contents.tasks === 0;

      if (opts.dryRun) {
        wouldDelete.push({ id: id, name: name, contents: contents, empty: isEmpty, blocked: !isEmpty && !opts.force });
        continue;
      }

      if (!isEmpty && !opts.force) {
        refused.push({
          id: id,
          name: name,
          contents: contents,
          error: "Project is not empty (" + contents.tasks + " task(s), " + contents.remaining +
                 " remaining). Deleting it removes all of them permanently. Re-run with --force to proceed."
        });
        continue;
      }

      try {
        app.delete(project);
        deleted.push({ id: id, name: name, contents: contents });
      } catch (e) {
        errors.push({ id: nameOrId, name: name, error: e.message });
      }
    }

    if (opts.dryRun) {
      // Errors surface in the preview too — reporting "0 would be deleted" with
      // success:true for a typo'd name defeats the point of previewing.
      return JSON.stringify({
        success: errors.length === 0,
        dryRun: true,
        message: "DRY RUN: " + wouldDelete.length + " project(s) would be deleted" +
                 (errors.length > 0 ? ", " + errors.length + " not found" : ""),
        wouldDelete: wouldDelete,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return JSON.stringify({
      success: errors.length === 0 && refused.length === 0,
      message: deleted.length + " project(s) deleted",
      deleted: deleted,
      refused: refused.length > 0 ? refused : undefined,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
