# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `of qe "name" --save` left an empty Quick Entry panel on screen after
  saving. The panel now closes. Without `--save` it stays open with the task
  filled in, as before.

## [1.2.0] - 2026-09-29

### Added

- Weekday names on every date flag, in full or as three letters: `friday`,
  `fri`, `next friday`. A weekday is the first such day after today, and
  `next friday` means the same as `friday`. The date takes the field's
  default time like any other date without one.

### Changed

- Dates given without a time of day (`2026-10-01`, `today`, `+3d`) now take
  the default time OmniFocus uses for that field, read from your OmniFocus
  settings, instead of 5 p.m. for every field. Factory defaults apply if the
  settings cannot be read: due 5 p.m., defer midnight, planned 9 a.m.
  **Bare due dates move** if your default due time is not 5 p.m. Existing
  stored dates are not migrated.
  ([#1](https://github.com/2b3pro/omnifocus-mcp-cli/issues/1))
- `of search --due-before` and `--due-after` treat a bare date as the whole
  day: `--due-before` runs to the end of it and `--due-after` starts at the
  beginning. Both previously compared at 5 p.m., so `--due-before tomorrow`
  missed a task due tomorrow evening.
- `of complete --on` with a bare date stamps noon on that day, not 5 p.m.
  A bare date that is today stamps the current time.
- A date that cannot be parsed (`last friday`, `3d`, `2026-02-30`) or a
  malformed `--due-by`/`--defer-by`/`--planned-by` offset is now an error on
  `add`, `add project`, `modify`, `project modify` and `qe`, including with
  `--dry-run`. Previously the command reported success and left the date
  unset. Nothing is created or modified when a date is rejected. An
  unparseable `of search` date filter is likewise an error; previously the
  filter was dropped and every task was returned.
- Date flags accept only the documented forms: the keywords, relative
  offsets, `YYYY-MM-DD`, and ISO timestamps. Other input was handed to the
  JavaScript engine's own parser, which stored `10/1/2026` at midnight
  whatever the field and read `Oct 1` as the year 2000. It is now an error
  that names the accepted forms.
- Every command exits non-zero when it reports a failure. Before, only
  `modify` did; the rest printed the error and exited 0, so a script could
  not tell a failed `of add` or `of delete` from a successful one without
  parsing the output.
- `of flag` and `of unflag` report the tasks they could not change. They
  previously printed "N task(s) flagged" for every id given, and
  `"success": true` in JSON, whether or not the task existed.

### Fixed

- A bare date on `--defer` hid the task until 5 p.m. on that day.
  ([#1](https://github.com/2b3pro/omnifocus-mcp-cli/issues/1))
- `of complete --on today` recorded a completion at 5 p.m., which is in the
  future when run earlier in the day.
- `of list forecast` grouped tasks by their UTC day, so a task due in the
  evening was listed under the following day in timezones west of UTC.
- `of qe "name"` failed with "Can't make class." and created nothing. With
  `--save` it now creates the task, saves it to the inbox and returns it.
- MCP: `due` and `defer` on task and project `create`/`update` were silently
  dropped.
- MCP: other options were sent under names the scripts do not read, so they
  had no effect while the call reported success:
  - `estimate_mins` on task `create`/`update`.
  - `include_completed` on every task, project and tag list.
  - `include_on_hold` on the project list, `include_hidden` on the tag and
    folder lists, and `flagged` on the today view.
  - Project `complete`, `drop` and `set_status`, tag `delete`, and
    `mark_reviewed` changed nothing.
- MCP: task `complete`, `drop` and `delete` acted on the first of several
  `ids` only.
- MCP: `tags` on task `update` was ignored. It now replaces the task's tags;
  an empty list clears them, and an unknown tag is an error.

## [1.1.1] - 2026-09-19

### Fixed

- Date-only inputs (`YYYY-MM-DD`) now resolve to 5 p.m. local time, matching
  relative dates, instead of UTC midnight (the previous evening in Pacific
  time). Explicit timestamps retain their time and offset. Existing stored
  dates are not migrated.

## [1.1.0] - 2026-08-09

### Added

- `of project delete` (alias `rm`) — permanent project deletion. Refuses
  non-empty projects unless `--force` is given, reporting exactly how many
  tasks would be lost; `--dry-run` previews contents. Accepts multiple
  names/IDs.
- `of folder delete` — folder deletion with the same non-empty guard.
- `of complete --on <date>` — backdate a completion (`-2d`, `yesterday`, ISO)
  instead of stamping now. Completion results now include the recorded
  `completionDate`.
- Date parser: `yesterday`, negative offsets, and month/year units. All date
  flags now accept `±N` with `d`/`w`/`m`/`y` (`+3d`, `-2w`, `+1m`, `-1y`).
- Planned date and review interval support on tasks and projects.
- `ownDueDate` field in full task output — the task's own (uninherited) due
  date, alongside the effective `dueDate`.

### Changed

- Read performance: all list/search readers fetch properties in bulk
  (one Apple Event per property per collection, not per task) — search went
  from 29.5s to 0.8s on a real database.
- ID lookup resolves via `whose()` — 12.4s to 48ms.
- `dueDate` in full output now reports the effective (project-inherited) due
  date, matching what OmniFocus displays and what `--brief` already reported.
- Test cleanup now batches deletions, asserts that cleanup actually succeeded,
  and sweeps the database by `CLI_Test_` prefix so nothing is left behind.

### Fixed

- `of list flagged` now matches OmniFocus's Flagged perspective: tasks
  inheriting a flag from their project or an ancestor task are included, and
  tasks that are only effectively completed/dropped (via their container) are
  excluded.
- `of modify --project` moves tasks via Omni Automation `moveTasks`; `modify`
  exits non-zero on any error.
- `of folder delete --dry-run` surfaces not-found errors instead of reporting
  success.

### Documentation

- README: "Automation APIs: JXA and OmniJS" — measured comparison of the two
  automation surfaces, why JXA bulk fetch wins for reads (0.21s vs 1.78s vs
  19.3s), where neither API is a superset of the other, and when to reach for
  `evaluateJavascript`.
- README: sketchnote overview image; command reference updated for the new
  commands and corrected `drop`/`delete` usage.

## [1.0.0] - 2026-01-08

### Added

- Initial release: `of` CLI for OmniFocus 4 on macOS — add, list, search,
  get, modify, complete, drop, delete, flag, project/folder/tag management,
  review, perspectives, quick entry, sync, shell completions, and an MCP
  server exposing the same operations to AI assistants.
- Output modes: human-readable, `--json`, `--pretty`, `--quiet`.
- Natural date parsing and `--dry-run` on write operations.
