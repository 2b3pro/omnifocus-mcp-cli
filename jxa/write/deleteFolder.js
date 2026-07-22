// Delete folder(s)
//
// SAFETY: deleting a folder in OmniFocus takes everything inside it —
// every project, every task in those projects, and every subfolder. That is
// not recoverable through this CLI. So a folder holding anything is REFUSED
// unless --force is given, and the refusal names exactly what would be lost.
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    // A JSON array, not a comma-joined string: folder NAMES may contain commas.
    const folderIds = parseJsonArg(4, []).filter(x => x && String(x).trim());
    const opts = parseJsonArg(5, {});

    if (folderIds.length === 0) {
      return JSON.stringify({ success: false, error: "Folder name(s) or ID(s) required" });
    }

    const deleted = [];
    const errors = [];
    const wouldDelete = [];
    const refused = [];

    // What lives inside a folder, counted before anything is removed.
    const survey = (folder) => {
      let projects = 0, subfolders = 0, tasks = 0;
      try { projects = folder.flattenedProjects().length; } catch {}
      try { subfolders = folder.flattenedFolders().length; } catch {}
      try {
        const projs = folder.flattenedProjects();
        for (let i = 0; i < projs.length; i++) {
          try { tasks += projs[i].numberOfTasks(); } catch {}
        }
      } catch {}
      return { projects: projects, subfolders: subfolders, tasks: tasks };
    };

    for (const raw of folderIds) {
      const nameOrId = raw.trim();
      const folder = findFolder(doc, nameOrId);

      if (!folder) {
        errors.push({ id: nameOrId, error: "Folder not found" });
        continue;
      }

      let name, id, contents;
      try {
        name = folder.name();
        id = folder.id();
        contents = survey(folder);
      } catch (e) {
        errors.push({ id: nameOrId, error: "Could not read folder: " + e.message });
        continue;
      }

      const isEmpty = contents.projects === 0 && contents.subfolders === 0;

      if (opts.dryRun) {
        wouldDelete.push({ id: id, name: name, contents: contents, empty: isEmpty, blocked: !isEmpty && !opts.force });
        continue;
      }

      if (!isEmpty && !opts.force) {
        refused.push({
          id: id,
          name: name,
          contents: contents,
          error: "Folder is not empty (" + contents.projects + " project(s), " +
                 contents.subfolders + " subfolder(s), " + contents.tasks +
                 " task(s)). Deleting it removes all of them permanently. Re-run with --force to proceed."
        });
        continue;
      }

      try {
        app.delete(folder);
        deleted.push({ id: id, name: name, contents: contents });
      } catch (e) {
        errors.push({ id: nameOrId, name: name, error: e.message });
      }
    }

    if (opts.dryRun) {
      // Errors must surface here too. Reporting "0 folder(s) would be deleted"
      // with success:true for a name that does not exist tells someone who
      // typo'd it that everything is fine — the preview's whole job is to warn.
      return JSON.stringify({
        success: errors.length === 0,
        dryRun: true,
        message: "DRY RUN: " + wouldDelete.length + " folder(s) would be deleted" +
                 (errors.length > 0 ? ", " + errors.length + " not found" : ""),
        wouldDelete: wouldDelete,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return JSON.stringify({
      success: errors.length === 0 && refused.length === 0,
      message: deleted.length + " folder(s) deleted",
      deleted: deleted,
      refused: refused.length > 0 ? refused : undefined,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
