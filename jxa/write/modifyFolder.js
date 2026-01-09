// Modify an existing folder
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const nameOrId = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!nameOrId) {
      return JSON.stringify({ success: false, error: "Folder name or ID is required" });
    }

    const folder = findFolder(doc, nameOrId);
    if (!folder) {
      return JSON.stringify({ success: false, error: "Folder not found: " + nameOrId });
    }

    // Dry run mode
    if (opts.dryRun) {
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: "DRY RUN: Folder would be modified",
        preview: {
          current: formatFolder(folder),
          changes: opts
        }
      });
    }

    const changes = [];

    // Rename folder
    if (opts.name && opts.name !== folder.name()) {
      folder.name = opts.name;
      changes.push("name");
    }

    // Update note
    if (opts.note !== undefined) {
      folder.note = opts.note;
      changes.push("note");
    }

    // Toggle hidden
    if (opts.hidden !== undefined) {
      folder.hidden = opts.hidden;
      changes.push("hidden");
    }

    return JSON.stringify({
      success: true,
      message: changes.length > 0 ? `Folder modified: ${changes.join(", ")}` : "No changes made",
      folder: formatFolder(folder),
      changes: changes
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
