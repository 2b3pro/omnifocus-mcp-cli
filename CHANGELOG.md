# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
