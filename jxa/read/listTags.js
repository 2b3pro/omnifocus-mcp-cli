// List tags
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const allTags = doc.flattenedTags();
    const tags = [];

    const limit = opts.limit || 100;
    let count = 0;

    for (let i = 0; i < allTags.length && count < limit; i++) {
      const tag = allTags[i];

      // Skip hidden unless requested
      if (!opts.includeHidden && tag.hidden()) continue;

      tags.push(formatTag(tag));
      count++;
    }

    return JSON.stringify({
      success: true,
      tags: tags,
      totalCount: allTags.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
