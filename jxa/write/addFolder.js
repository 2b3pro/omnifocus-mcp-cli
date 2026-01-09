// Add a new folder
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const name = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!name) {
      return JSON.stringify({ success: false, error: "Folder name is required" });
    }

    // Dry run mode
    if (opts.dryRun) {
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: "DRY RUN: Folder would be created",
        preview: {
          name: name,
          parent: opts.parent || "(root)"
        }
      });
    }

    let folder;

    if (opts.parent) {
      // Add to specific parent folder
      const parentFolder = findFolder(doc, opts.parent);
      if (!parentFolder) {
        return JSON.stringify({ success: false, error: "Parent folder not found: " + opts.parent });
      }
      folder = app.Folder({ name: name });
      parentFolder.folders.push(folder);
    } else {
      // Add to document root
      folder = app.Folder({ name: name });
      doc.folders.push(folder);
    }

    return JSON.stringify({
      success: true,
      message: "Folder created successfully",
      folder: formatFolder(folder)
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
