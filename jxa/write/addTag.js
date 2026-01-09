// Add a new tag
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const name = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!name) {
      return JSON.stringify({ success: false, error: "Tag name is required" });
    }

    // Check if tag already exists
    const existing = findTag(doc, name);
    if (existing && !opts.force) {
      return JSON.stringify({
        success: false,
        error: "Tag already exists: " + name,
        existingTag: formatTag(existing)
      });
    }

    // Dry run mode
    if (opts.dryRun) {
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: "DRY RUN: Tag would be created",
        preview: {
          name: name,
          parent: opts.parent || "(root)"
        }
      });
    }

    let tag;

    if (opts.parent) {
      // Add as child of existing tag
      const parentTag = findTag(doc, opts.parent);
      if (!parentTag) {
        return JSON.stringify({ success: false, error: "Parent tag not found: " + opts.parent });
      }
      tag = app.Tag({ name: name });
      parentTag.tags.push(tag);
    } else {
      // Add to root level
      tag = app.Tag({ name: name });
      doc.tags.push(tag);
    }

    // Set additional properties
    if (opts.allowsNextAction !== undefined) {
      tag.allowsNextAction = opts.allowsNextAction;
    }

    return JSON.stringify({
      success: true,
      message: "Tag created successfully",
      tag: formatTag(tag)
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
