// List folders
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    let sourceFolders;

    if (opts.folder) {
      // List subfolders within a specific folder
      const parentFolder = findFolder(doc, opts.folder);
      if (!parentFolder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + opts.folder });
      }
      sourceFolders = parentFolder.folders();
    } else if (opts.rootOnly) {
      // Root-level folders only
      sourceFolders = doc.folders();
    } else {
      // All folders (flattened)
      sourceFolders = doc.flattenedFolders();
    }

    const folders = [];
    const limit = opts.limit || 100;
    let count = 0;

    for (let i = 0; i < sourceFolders.length && count < limit; i++) {
      const folder = sourceFolders[i];

      // Skip hidden unless requested
      if (!opts.includeHidden && folder.hidden()) continue;

      folders.push(formatFolder(folder));
      count++;
    }

    return JSON.stringify({
      success: true,
      folders: folders,
      totalCount: sourceFolders.length,
      parentFolder: opts.folder || null
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
