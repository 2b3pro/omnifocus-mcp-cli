// List projects due for review
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const opts = parseJsonArg(4, {});

    const limit = opts.limit || 50;
    const includeAll = opts.all || false;  // Include projects not needing review

    const allProjects = doc.flattenedProjects();
    const projects = [];
    const now = new Date();

    for (let i = 0; i < allProjects.length && projects.length < limit; i++) {
      const project = allProjects[i];

      // Skip completed/dropped projects
      const status = project.status();
      if (status === "done status" || status === "dropped status") continue;

      // Check if due for review
      const nextReview = project.nextReviewDate();

      if (includeAll) {
        // Include all active projects
        projects.push({
          ...formatProject(project),
          needsReview: nextReview ? nextReview <= now : false
        });
      } else {
        // Only include projects needing review
        if (nextReview && nextReview <= now) {
          projects.push({
            ...formatProject(project),
            needsReview: true
          });
        }
      }
    }

    // Sort by next review date (most overdue first)
    projects.sort((a, b) => {
      if (!a.nextReviewDate) return 1;
      if (!b.nextReviewDate) return -1;
      return new Date(a.nextReviewDate) - new Date(b.nextReviewDate);
    });

    return JSON.stringify({
      success: true,
      projects: projects,
      dueCount: projects.filter(p => p.needsReview).length,
      totalCount: projects.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
