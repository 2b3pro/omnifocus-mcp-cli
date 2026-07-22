// Modify project status and properties
(() => {
  try {
    const app = getApp();
    const doc = getDoc(app);
    const nameOrId = getArg(4, "");
    const opts = parseJsonArg(5, {});

    if (!nameOrId) {
      return JSON.stringify({ success: false, error: "Project name or ID is required" });
    }

    const project = findProject(doc, nameOrId);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + nameOrId });
    }

    // Dry run mode
    if (opts.dryRun) {
      return JSON.stringify({
        success: true,
        dryRun: true,
        message: "DRY RUN: Project would be modified",
        preview: {
          current: formatProject(project),
          changes: opts
        }
      });
    }

    const changes = [];

    // Status changes
    if (opts.status) {
      const statusMap = {
        "active": "active status",
        "on-hold": "on hold status",
        "onhold": "on hold status",
        "hold": "on hold status",
        "done": "done status",
        "completed": "done status",
        "dropped": "dropped status",
        "drop": "dropped status"
      };

      const status = statusMap[opts.status.toLowerCase()];
      if (status) {
        project.status = status;
        changes.push("status → " + opts.status);
      }
    }

    // Complete project
    if (opts.complete) {
      project.markComplete();
      changes.push("completed");
    }

    // Drop project (must use markDropped method, not direct status assignment)
    if (opts.drop) {
      project.markDropped();
      changes.push("dropped");
    }

    // Hold project
    if (opts.hold) {
      project.status = "on hold status";
      changes.push("on hold");
    }

    // Activate project (resume from hold)
    if (opts.activate) {
      project.status = "active status";
      changes.push("activated");
    }

    // Rename
    if (opts.name) {
      project.name = opts.name;
      changes.push("name");
    }

    // Note
    if (opts.note !== undefined) {
      project.note = opts.note;
      changes.push("note");
    }

    // Due date
    if (opts.dueDate) {
      const due = parseDate(opts.dueDate);
      if (due) {
        project.dueDate = due;
        changes.push("dueDate");
      }
    }

    // Clear due date
    if (opts.clearDue) {
      project.dueDate = null;
      changes.push("cleared dueDate");
    }

    // Defer date
    if (opts.deferDate) {
      const defer = parseDate(opts.deferDate);
      if (defer) {
        project.deferDate = defer;
        changes.push("deferDate");
      }
    }

    // Clear defer date
    if (opts.clearDefer) {
      project.deferDate = null;
      changes.push("cleared deferDate");
    }

    // Flagged
    if (opts.flagged !== undefined) {
      project.flagged = opts.flagged;
      changes.push("flagged → " + opts.flagged);
    }

    // Sequential
    if (opts.sequential !== undefined) {
      project.sequential = opts.sequential;
      changes.push("sequential → " + opts.sequential);
    }

    // Review date
    if (opts.reviewed) {
      project.lastReviewDate = new Date();
      changes.push("marked reviewed");
    }

    // Review interval — "1w", "2m", "10d", "1y". OmniFocus stores this as a
    // repetition-interval record {unit, steps, fixed}; `fixed` is preserved
    // from the project's existing interval so we don't silently flip its
    // fixed/sliding behavior while only changing the cadence.
    if (opts.reviewInterval !== undefined) {
      const match = String(opts.reviewInterval).trim().match(/^(\d+)\s*([dwmy])$/i);
      if (!match) {
        return JSON.stringify({
          success: false,
          error: "Invalid review interval: " + opts.reviewInterval + ". Expected <number><d|w|m|y>, e.g. 1w, 2m, 10d, 1y."
        });
      }
      const unitMap = { d: "day", w: "week", m: "month", y: "year" };
      const steps = parseInt(match[1], 10);
      const unit = unitMap[match[2].toLowerCase()];

      let fixed = true;
      try {
        const existing = project.reviewInterval();
        if (existing && typeof existing.fixed === "boolean") fixed = existing.fixed;
      } catch {}

      project.reviewInterval = { unit: unit, steps: steps, fixed: fixed };
      changes.push("reviewInterval → " + steps + " " + unit + (steps === 1 ? "" : "s"));
    }

    // Tag ("" or null clears the primary tag)
    if (opts.tag !== undefined) {
      if (opts.tag === null || opts.tag === "") {
        project.primaryTag = null;
        changes.push("cleared tag");
      } else {
        const tag = findTag(doc, opts.tag);
        if (tag) {
          project.primaryTag = tag;
          changes.push("tag → " + opts.tag);
        } else {
          return JSON.stringify({ success: false, error: "Tag not found: " + opts.tag });
        }
      }
    }

    // Return minimal info (formatProject is slow due to IPC overhead)
    return JSON.stringify({
      success: true,
      message: changes.length > 0 ? `Project modified: ${changes.join(", ")}` : "No changes made",
      project: {
        id: project.id(),
        name: project.name(),
        status: project.status()
      },
      changes: changes
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
