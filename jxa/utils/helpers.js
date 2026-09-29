// OmniFocus JXA Shared Helper Functions
// This file is prepended to scripts by the JXA runner.

/**
 * Get command line argument safely
 * @param {number} index - The absolute index expected (4 = first user arg)
 * @param {any} defaultValue - Default value if missing
 * @returns {string|any} - The argument value
 */
function getArg(index, defaultValue) {
  const args = $.NSProcessInfo.processInfo.arguments;

  // Look for "--" separator used by runJxa
  let separatorIndex = -1;
  for (let i = 0; i < args.count; i++) {
    if (ObjC.unwrap(args.objectAtIndex(i)) === "--") {
      separatorIndex = i;
      break;
    }
  }

  let realIndex = index;
  if (separatorIndex !== -1) {
    realIndex = separatorIndex + 1 + (index - 4);
  }

  if (args.count <= realIndex) return defaultValue;
  const arg = ObjC.unwrap(args.objectAtIndex(realIndex));
  return arg && arg.length > 0 ? arg : defaultValue;
}

/**
 * Parse JSON argument safely
 */
function parseJsonArg(index, defaultValue) {
  const arg = getArg(index, null);
  if (!arg) return defaultValue;
  try {
    return JSON.parse(arg);
  } catch {
    return defaultValue;
  }
}

/**
 * Get the OmniFocus application
 */
function getApp() {
  const app = Application("OmniFocus");
  app.includeStandardAdditions = true;
  return app;
}

/**
 * Get the default document
 */
function getDoc(app) {
  return app.defaultDocument;
}

/**
 * Format task for JSON output
 */
/**
 * Format a whole task COLLECTION for JSON output — bulk property fetch.
 *
 * Why this exists: in JXA every property read on a single object is one Apple
 * Event round-trip, measured at ~17ms against OmniFocus 4.8.12. formatTask()
 * reads 14 properties, so formatting N tasks one at a time costs N * 14 * 17ms
 * — about 156 seconds for a 766-task database. Asking the COLLECTION for a
 * property (`tasks.name()`) is a single Apple Event returning an array, ~15-130ms
 * regardless of N. Same data, ~380x less wall clock.
 *
 * Takes a JXA collection (e.g. doc.flattenedTasks, or the result of .whose()),
 * NOT an array of task objects — the speedup comes from the collection itself
 * resolving each property in one call. Returns objects identical in shape to
 * formatTask(), so callers and their consumers are unaffected.
 *
 * Each property is fetched independently: a property unsupported by the running
 * OmniFocus (plannedDate on older versions) degrades to nulls for every row
 * rather than failing the batch.
 */
function formatTasksBulk(collection) {
  // Every property array is indexed positionally against `ids`. A short array
  // would silently shift every subsequent row's values onto the wrong task —
  // corruption that looks like valid data. So length is checked, and a
  // mismatched property is discarded (nulls) rather than zipped.
  let ids = null;
  try {
    const v = collection.id();
    ids = Array.isArray(v) ? v : null;
  } catch {
    ids = null;
  }
  if (!ids) return [];   // can't identify rows; caller should fall back
  const n = ids.length;
  const blank = () => new Array(n).fill(null);

  const col = (fn) => {
    try {
      const v = fn();
      if (!Array.isArray(v) || v.length !== n) return null;
      return v;
    } catch {
      return null;
    }
  };

  const names = col(() => collection.name()) || blank();
  const notes = col(() => collection.note()) || blank();
  const completed = col(() => collection.completed()) || blank();
  const flagged = col(() => collection.flagged()) || blank();
  const defer = col(() => collection.deferDate()) || blank();
  const planned = col(() => collection.plannedDate()) || blank();
  // `dueDate` reports the effective date — the one OmniFocus itself shows, inherited
  // from the containing project when the task has none. The brief formatter already
  // did this; full mode read the own property, so the same task could show a date in
  // --brief and null in --full. `ownDueDate` keeps the uninherited value available.
  const due = col(() => collection.effectiveDueDate()) || blank();
  const ownDue = col(() => collection.dueDate()) || blank();
  const completion = col(() => collection.completionDate()) || blank();
  const estimates = col(() => collection.estimatedMinutes()) || blank();
  const inInbox = col(() => collection.inInbox()) || blank();
  const blocked = col(() => collection.blocked()) || blank();
  const projNames = col(() => collection.containingProject.name()) || blank();
  const tagNames = col(() => collection.tags.name()) || blank();

  const iso = (d) => (d ? new Date(d).toISOString() : null);

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      id: ids[i],
      name: names[i],
      note: notes[i] || "",
      completed: completed[i],
      flagged: flagged[i],
      deferDate: iso(defer[i]),
      plannedDate: iso(planned[i]),
      dueDate: iso(due[i]),
      ownDueDate: iso(ownDue[i]),
      completionDate: iso(completion[i]),
      estimatedMinutes: estimates[i] || null,
      inInbox: inInbox[i],
      blocked: blocked[i],
      tags: Array.isArray(tagNames[i]) ? tagNames[i] : [],
      projectName: projNames[i] === undefined ? null : projNames[i]
    };
  }
  return out;
}

/**
 * Brief bulk formatter — the {id, name, dueDate, flagged, completed} shape used
 * by list commands' `--brief` mode. Uses effectiveDueDate (inherited from the
 * containing project when the task has none), matching the per-task path.
 */
function formatTasksBriefBulk(collection) {
  let ids = null;
  try {
    const v = collection.id();
    ids = Array.isArray(v) ? v : null;
  } catch {
    ids = null;
  }
  if (!ids) return [];
  const n = ids.length;
  const blank = () => new Array(n).fill(null);
  const col = (fn) => {
    try {
      const v = fn();
      if (!Array.isArray(v) || v.length !== n) return null;
      return v;
    } catch {
      return null;
    }
  };

  const names = col(() => collection.name()) || blank();
  const due = col(() => collection.effectiveDueDate()) || blank();
  const flagged = col(() => collection.flagged()) || blank();
  const completed = col(() => collection.completed()) || blank();

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      id: ids[i],
      name: names[i],
      dueDate: due[i] ? new Date(due[i]).toISOString() : null,
      flagged: flagged[i],
      completed: completed[i]
    };
  }
  return out;
}

function formatTask(task) {
  try {
    const tags = [];
    try {
      const taskTags = task.tags();
      for (let i = 0; i < taskTags.length; i++) {
        tags.push(taskTags[i].name());
      }
    } catch {}

    let projectName = null;
    try {
      const proj = task.containingProject();
      if (proj) projectName = proj.name();
    } catch {}

    // Planned date requires a newer OmniFocus than defer/due do. Probe it
    // defensively so an older app degrades to null instead of throwing the
    // whole formatter into its catch and losing every other field.
    let plannedDate = null;
    try {
      const p = task.plannedDate();   // single IPC round-trip; formatTask runs per search result
      plannedDate = p ? p.toISOString() : null;
    } catch {}

    return {
      id: task.id(),
      name: task.name(),
      note: task.note() || "",
      completed: task.completed(),
      flagged: task.flagged(),
      deferDate: task.deferDate() ? task.deferDate().toISOString() : null,
      plannedDate: plannedDate,
      dueDate: task.dueDate() ? task.dueDate().toISOString() : null,
      completionDate: task.completionDate() ? task.completionDate().toISOString() : null,
      estimatedMinutes: task.estimatedMinutes() || null,
      inInbox: task.inInbox(),
      blocked: task.blocked(),
      tags: tags,
      projectName: projectName
    };
  } catch (e) {
    return { id: task.id(), name: task.name(), error: e.message };
  }
}


/**
 * Effective flag/completion state for a whole task collection, bulk-fetched.
 *
 * OmniFocus's Flagged perspective shows a task when it is flagged OR inherits a
 * flag from its containing project OR from an ancestor task. The JXA dictionary
 * has no `effectiveFlagged` property (unlike OmniJS), so the inheritance closure
 * is resolved here from three bulk arrays — still one Apple Event per property
 * for the entire collection, and measurably faster than dropping into OmniJS.
 *
 * Exclusion uses effectivelyCompleted/effectivelyDropped, not the own properties:
 * a live task inside a dropped project is effectivelyDropped, and filtering on
 * `dropped` alone leaks it into results. (These two exist in JXA but not OmniJS.)
 *
 * Verified to return exactly the same id set as OmniJS effectiveFlagged.
 */
function effectiveFlagsBulk(collection) {
  const col = (fn) => {
    try {
      const v = fn();
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };

  const ids = col(() => collection.id());
  if (!ids) return null;
  const n = ids.length;
  const blank = () => new Array(n).fill(false);
  const sized = (v) => (v && v.length === n ? v : null);

  const flagged = sized(col(() => collection.flagged())) || blank();
  const effCompleted = sized(col(() => collection.effectivelyCompleted())) || blank();
  const effDropped = sized(col(() => collection.effectivelyDropped())) || blank();
  const projFlagged = sized(col(() => collection.containingProject.flagged()));
  const parentIds = sized(col(() => collection.parentTask.id()));

  const idx = {};
  for (let i = 0; i < n; i++) idx[ids[i]] = i;

  const memo = new Array(n).fill(undefined);
  const resolve = (i, depth) => {
    if (memo[i] !== undefined) return memo[i];
    if (depth > 100) return (memo[i] = !!flagged[i]);   // guard against a cyclic parent chain
    let v = !!flagged[i] || (projFlagged ? projFlagged[i] === true : false);
    if (!v && parentIds && parentIds[i] != null) {
      const pi = idx[parentIds[i]];
      if (pi !== undefined) v = resolve(pi, depth + 1);
    }
    return (memo[i] = !!v);
  };

  const effFlagged = new Array(n);
  for (let i = 0; i < n; i++) effFlagged[i] = resolve(i, 0);

  return { ids: ids, effFlagged: effFlagged, effCompleted: effCompleted, effDropped: effDropped };
}

/**
 * Format project for JSON output
 */
function formatProject(project) {
  try {
    let folderName = null;
    try {
      const folder = project.folder();
      if (folder) folderName = folder.name();
    } catch {}

    let primaryTag = null;
    try {
      const tag = project.primaryTag();
      if (tag) primaryTag = tag.name();
    } catch {}

    // Both are version-dependent; degrade to null rather than throwing the
    // formatter into its catch (see formatTask).
    let plannedDate = null;
    try {
      const p = project.plannedDate();
      plannedDate = p ? p.toISOString() : null;
    } catch {}

    let reviewInterval = null;
    try {
      const ri = project.reviewInterval();
      if (ri) reviewInterval = { unit: ri.unit, steps: ri.steps, fixed: ri.fixed };
    } catch {}

    return {
      id: project.id(),
      name: project.name(),
      note: project.note() || "",
      status: project.status(),
      completed: project.completed(),
      flagged: project.flagged(),
      sequential: project.sequential(),
      deferDate: project.deferDate() ? project.deferDate().toISOString() : null,
      plannedDate: plannedDate,
      dueDate: project.dueDate() ? project.dueDate().toISOString() : null,
      completionDate: project.completionDate() ? project.completionDate().toISOString() : null,
      lastReviewDate: project.lastReviewDate() ? project.lastReviewDate().toISOString() : null,
      nextReviewDate: project.nextReviewDate() ? project.nextReviewDate().toISOString() : null,
      reviewInterval: reviewInterval,
      taskCount: project.numberOfTasks(),
      availableTaskCount: project.numberOfAvailableTasks(),
      completedTaskCount: project.numberOfCompletedTasks(),
      folderName: folderName,
      primaryTag: primaryTag,
      singletonActionHolder: project.singletonActionHolder()
    };
  } catch (e) {
    return { id: project.id(), name: project.name(), error: e.message };
  }
}

/**
 * Format folder for JSON output
 */
function formatFolder(folder) {
  try {
    let containerName = null;
    try {
      const container = folder.container();
      if (container && container.name) containerName = container.name();
    } catch {}

    return {
      id: folder.id(),
      name: folder.name(),
      note: folder.note() || "",
      hidden: folder.hidden(),
      projectCount: folder.projects().length,
      folderCount: folder.folders().length,
      containerName: containerName
    };
  } catch (e) {
    return { id: folder.id(), name: folder.name(), error: e.message };
  }
}

/**
 * Format tag for JSON output
 */
function formatTag(tag) {
  try {
    let containerName = null;
    try {
      const container = tag.container();
      if (container && container.name) containerName = container.name();
    } catch {}

    return {
      id: tag.id(),
      name: tag.name(),
      allowsNextAction: tag.allowsNextAction(),
      hidden: tag.hidden(),
      taskCount: tag.availableTaskCount(),
      remainingTaskCount: tag.remainingTaskCount(),
      containerName: containerName
    };
  } catch (e) {
    return { id: tag.id(), name: tag.name(), error: e.message };
  }
}

/**
 * Find project by name or ID
 */
function findProject(doc, nameOrId) {
  // ID takes precedence over name, matching the original two-pass order.
  const byId = firstWhere(doc.flattenedProjects, { id: nameOrId });
  if (byId) return byId;

  const byName = firstWhere(doc.flattenedProjects, { name: nameOrId });
  if (byName) return byName;

  // Fallback: the original scans, if whose() cannot serve these queries.
  try {
    const projects = doc.flattenedProjects();
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].id() === nameOrId) {
        return projects[i];
      }
    }
  } catch {}

  try {
    const projects = doc.flattenedProjects();
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].name() === nameOrId) {
        return projects[i];
      }
    }
  } catch {}

  return null;
}

/**
 * Find tag by name or ID
 */
function findTag(doc, nameOrId) {
  // NOTE: the original matched id-or-name in ONE pass, so whichever came first
  // in collection order won. This checks id across all tags before name, so an
  // id match now beats an earlier name match. That only differs if a tag's NAME
  // equals a different tag's ID — OmniFocus IDs are opaque strings, so this is
  // a theoretical difference, but it is a difference.
  const byId = firstWhere(doc.flattenedTags, { id: nameOrId });
  if (byId) return byId;

  const byName = firstWhere(doc.flattenedTags, { name: nameOrId });
  if (byName) return byName;

  // Fallback: the original single-pass scan.
  try {
    const tags = doc.flattenedTags();
    for (let i = 0; i < tags.length; i++) {
      if (tags[i].id() === nameOrId || tags[i].name() === nameOrId) {
        return tags[i];
      }
    }
  } catch {}
  return null;
}

/**
 * Find folder by name or ID
 */
function findFolder(doc, nameOrId) {
  // Same id-before-name caveat as findTag.
  const byId = firstWhere(doc.flattenedFolders, { id: nameOrId });
  if (byId) return byId;

  const byName = firstWhere(doc.flattenedFolders, { name: nameOrId });
  if (byName) return byName;

  try {
    const folders = doc.flattenedFolders();
    for (let i = 0; i < folders.length; i++) {
      if (folders[i].id() === nameOrId || folders[i].name() === nameOrId) {
        return folders[i];
      }
    }
  } catch {}
  return null;
}

/**
 * Find task by ID
 */
/**
 * Resolve the first element of a whose() specifier, or null.
 *
 * whose() pushes the comparison into OmniFocus instead of walking the
 * collection from JXA. The linear scan it replaces costs one Apple Event per
 * element: measured against a 743-task database, finding the LAST task took
 * 12,400ms by scan versus 17ms via whose(), and whose() is flat regardless of
 * where the element sits. That position-dependence is why writes looked slow —
 * newly created tasks land at the end of the collection, so every modify of a
 * fresh task paid the worst case.
 *
 * Returns null (not undefined) on no match, and null if whose() is unsupported
 * for that key so callers can fall back.
 */
function firstWhere(collection, criteria) {
  try {
    const matches = collection.whose(criteria);
    if (!matches || matches.length === 0) return null;

    // CRITICAL: whose() returns a live FILTER, not a stable reference. Every
    // property access re-evaluates the predicate, so the moment a caller
    // mutates the filtered property the reference dies:
    //
    //   const t = tags.whose({name: "old"})[0];
    //   t.name = "new";      // succeeds
    //   t.name();            // throws "Invalid index." — nothing matches "old" now
    //
    // That regressed `tag modify --name` and `folder modify --name`. Re-anchor
    // to a by-ID reference, which survives renames and any other mutation.
    const id = matches[0].id();
    return collection.byId(id);
  } catch {
    return null;
  }
}

function findTask(doc, taskId) {
  const hit = firstWhere(doc.flattenedTasks, { id: taskId });
  if (hit) return hit;

  // Fallback: linear scan, for any case where whose() cannot serve the query.
  try {
    const tasks = doc.flattenedTasks();
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id() === taskId) {
        return tasks[i];
      }
    }
  } catch {}
  return null;
}

// Time of day given to a date typed without one. OmniFocus keeps a separate
// default per field; these are its factory values, used when the user's
// settings cannot be read.
const FACTORY_DEFAULT_TIMES = { due: [17, 0, 0], defer: [0, 0, 0], planned: [9, 0, 0] };

// Fields with no OmniFocus setting behind them, as [h, m, s, ms]. Search
// bounds cover the whole of the day they name; a backdated completion lands
// mid-day (and see parseDate for a completion dated today).
const FIXED_DEFAULT_TIMES = {
  after: [0, 0, 0, 0],
  before: [23, 59, 59, 999],
  completion: [12, 0, 0, 0]
};

// parseDate() without a field keeps the 5pm it has always used.
const UNSPECIFIED_DEFAULT_TIME = [17, 0, 0];

let defaultTimesCache = null;

/**
 * Read the user's default due/defer/planned times from OmniFocus settings.
 * One Omni Automation round-trip for all three; values are clock strings
 * such as "07:00:00" or "09:00".
 */
function readDefaultTimeSettings() {
  return JSON.parse(Application("OmniFocus").evaluateJavascript(
    "JSON.stringify({" +
    " due: String(settings.objectForKey('DefaultDueTime'))," +
    " defer: String(settings.objectForKey('DefaultStartTime'))," +
    " planned: String(settings.objectForKey('DefaultPlannedTime'))" +
    "})"
  ));
}

/**
 * Parse a "HH:MM" or "HH:MM:SS" clock string into [h, m, s], or null
 */
function parseClockTime(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const clock = [Number(match[1]), Number(match[2]), Number(match[3] || 0)];
  if (clock[0] > 23 || clock[1] > 59 || clock[2] > 59) return null;
  return clock;
}

/**
 * Default time of day, as [h, m, s] or [h, m, s, ms], for a date field
 */
function defaultTimeFor(field) {
  if (FIXED_DEFAULT_TIMES.hasOwnProperty(field)) return FIXED_DEFAULT_TIMES[field];
  if (!FACTORY_DEFAULT_TIMES.hasOwnProperty(field)) return UNSPECIFIED_DEFAULT_TIME;

  if (!defaultTimesCache) {
    let settings = {};
    try {
      settings = readDefaultTimeSettings() || {};
    } catch {}
    defaultTimesCache = {};
    for (const name in FACTORY_DEFAULT_TIMES) {
      defaultTimesCache[name] = parseClockTime(settings[name]) || FACTORY_DEFAULT_TIMES[name];
    }
  }
  return defaultTimesCache[field];
}

/**
 * Parse natural date string. Forms other than these return null: handing the
 * rest to `new Date()` gave answers that differ by engine ("Oct 1" is the
 * year 2000 in JXA and 2001 in Node) and ignored the field's default time.
 * @param {string} dateStr - "today", "tomorrow", "yesterday", "next week",
 *   "+3d", "-2w", "YYYY-MM-DD", or an ISO timestamp "YYYY-MM-DDTHH:MM[:SS]"
 *   with an optional "Z" or "+HH:MM" offset
 * @param {string} [field] - picks the time of day for input that has none.
 *   "due", "defer", "planned": what OmniFocus uses for that field.
 *   "after", "before": start and end of the day, for search bounds.
 *   "completion": noon, or the current time if the day is today.
 */
function parseDate(dateStr, field) {
  if (!dateStr) return null;

  const now = new Date();
  const lowerDate = dateStr.toLowerCase().trim();
  const atDefaultTime = (d) => {
    // Any fixed time on today's date could still be ahead of the clock, and
    // a task cannot have been completed later than now.
    if (field === "completion" && localDateKey(d) === localDateKey(now)) return new Date(now);
    const time = defaultTimeFor(field);
    d.setHours(time[0], time[1], time[2], time[3] || 0);
    return d;
  };

  // Handle relative dates
  if (lowerDate === "today") {
    return atDefaultTime(new Date(now));
  }
  if (lowerDate === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return atDefaultTime(d);
  }
  if (lowerDate === "next week") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return atDefaultTime(d);
  }
  if (lowerDate === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return atDefaultTime(d);
  }

  // Relative offsets: [+-]N[dwmy] — "+3d", "-2w", "+1m", "-1y".
  // The sign is optional-negative rather than always "+" because backdating
  // (of complete --on -2d) needs to reach the past; "+3d" behaves as before.
  const relMatch = lowerDate.match(/^([+-])(\d+)([dwmy])$/);
  if (relMatch) {
    const sign = relMatch[1] === "-" ? -1 : 1;
    const amount = parseInt(relMatch[2], 10) * sign;
    const unit = relMatch[3];
    const d = new Date(now);
    if (unit === "d") d.setDate(d.getDate() + amount);
    else if (unit === "w") d.setDate(d.getDate() + amount * 7);
    else if (unit === "m") d.setMonth(d.getMonth() + amount);
    else if (unit === "y") d.setFullYear(d.getFullYear() + amount);
    return atDefaultTime(d);
  }

  // Date-only ISO input is a local calendar date, at the same default time
  // used by relative dates. new Date("YYYY-MM-DD") instead means UTC midnight,
  // which lands on the previous local day in timezones west of UTC.
  const dateOnly = lowerDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const parsed = new Date(0);
    // setFullYear avoids the Date constructor's 1900 offset for years 0-99.
    parsed.setFullYear(year, month, day);
    // Date setters normalize impossible dates; do not accept that rollover.
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day) {
      return null;
    }
    return atDefaultTime(parsed);
  }

  // Preserve explicit times and timezone offsets in timestamp input. Built
  // from its parts so that every engine reads it the same way and an
  // impossible date or time is rejected, not rolled over.
  const stamp = lowerDate.match(
    /^(\d{4})-(\d{2})-(\d{2})[t ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(z|[+-]\d{2}:?\d{2})?$/
  );
  if (!stamp) return null;

  const year = Number(stamp[1]);
  const month = Number(stamp[2]) - 1;
  const day = Number(stamp[3]);
  const hours = Number(stamp[4]);
  const minutes = Number(stamp[5]);
  const seconds = Number(stamp[6] || 0);
  const millis = Number(((stamp[7] || "") + "000").slice(0, 3));
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  const parsed = new Date(0);
  if (!stamp[8]) {
    parsed.setFullYear(year, month, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day) {
      return null;
    }
    parsed.setHours(hours, minutes, seconds, millis);
    return parsed;
  }

  parsed.setUTCFullYear(year, month, day);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== day) {
    return null;
  }
  parsed.setUTCHours(hours, minutes, seconds, millis);
  if (stamp[8] !== "z") {
    const offset = stamp[8].match(/^([+-])(\d{2}):?(\d{2})$/);
    const offsetHours = Number(offset[2]);
    const offsetMinutes = Number(offset[3]);
    if (offsetHours > 23 || offsetMinutes > 59) return null;
    const sign = offset[1] === "-" ? -1 : 1;
    parsed.setTime(parsed.getTime() - sign * (offsetHours * 60 + offsetMinutes) * 60000);
  }
  return parsed;
}

/**
 * parseDate() where a bad date must not pass silently: an unparseable date is
 * an error, so a mistyped date cannot report success while leaving a field
 * unset or a search filter unapplied. `label` names the date in the message
 * when the field alone would not ("due-before" rather than "before").
 */
function requireDate(dateStr, field, label) {
  const parsed = parseDate(dateStr, field);
  if (!parsed) {
    throw new Error(
      "Invalid " + (label || field) + " date: " + dateStr + ". Expected today, tomorrow, " +
      "yesterday, next week, an offset such as +3d or -2w, YYYY-MM-DD, or YYYY-MM-DDTHH:MM."
    );
  }
  return parsed;
}

/**
 * Local calendar day of a date as YYYY-MM-DD. toISOString() gives the UTC
 * day, which is the next day for an evening time west of UTC.
 */
function localDateKey(date) {
  const pad = (n) => (n < 10 ? "0" : "") + n;
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}
