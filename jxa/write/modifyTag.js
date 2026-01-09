// Modify or delete a tag
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const nameOrId = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!nameOrId) {
      return JSON.stringify({ success: false, error: "Tag name or ID is required" });
    }

    const tag = findTag(doc, nameOrId);
    if (!tag) {
      return JSON.stringify({ success: false, error: "Tag not found: " + nameOrId });
    }

    // Dry run mode
    if (opts.dryRun) {
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: opts.delete ? "DRY RUN: Tag would be deleted" : "DRY RUN: Tag would be modified",
        preview: {
          current: formatTag(tag),
          changes: opts
        }
      });
    }

    // Delete tag
    if (opts.delete) {
      const tagInfo = formatTag(tag);
      app.delete(tag);
      return JSON.stringify({
        success: true,
        message: "Tag deleted successfully",
        deletedTag: tagInfo
      });
    }

    const changes = [];

    // Rename tag
    if (opts.name && opts.name !== tag.name()) {
      tag.name = opts.name;
      changes.push("name → " + opts.name);
    }

    // Toggle hidden
    if (opts.hidden !== undefined) {
      tag.hidden = opts.hidden;
      changes.push("hidden → " + opts.hidden);
    }

    // Allows next action
    if (opts.allowsNextAction !== undefined) {
      tag.allowsNextAction = opts.allowsNextAction;
      changes.push("allowsNextAction → " + opts.allowsNextAction);
    }

    return JSON.stringify({
      success: true,
      message: changes.length > 0 ? `Tag modified: ${changes.join(", ")}` : "No changes made",
      tag: formatTag(tag),
      changes: changes
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
