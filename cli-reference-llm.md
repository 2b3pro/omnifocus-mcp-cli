---
title: OmniFocus CLI Reference
---

# OmniFocus CLI Reference

## Conventions

### Dates

Every option of type `(date)` accepts these forms and no others:

| Form | Examples |
|---|---|
| Keyword | `today`, `tomorrow`, `yesterday`, `next week` |
| Weekday, in full or as three letters | `friday`, `fri`, `next friday` |
| Relative offset, `±N` with `d`/`w`/`m`/`y` | `+3d`, `-2w`, `+1m`, `-1y` |
| ISO date | `2026-10-01` |
| ISO timestamp | `2026-10-01T09:30`, `2026-10-01T09:30:00-07:00`, `2026-10-01T16:30:00Z` |

- Anything else is an error, including `10/1/2026`, `Oct 1`, `Jan 15` and
  `last friday`. Convert such dates to `YYYY-MM-DD` first.
- A weekday is the first such day after today. `friday` given on a Friday is
  seven days away. `next friday` means the same as `friday`. For the Friday
  of the following week, give the date.
- A timestamp without an offset is local time.

A date given without a time of day takes a default time that depends on the
option:

| Option | Time given to a bare date |
|---|---|
| `--due` | The user's default due time in OmniFocus (factory default 17:00) |
| `--defer` | The user's default defer time in OmniFocus (factory default 00:00) |
| `--planned` | The user's default planned time in OmniFocus (factory default 09:00) |
| `--on` (complete) | 12:00, or the current time if the day is today |
| `--due-after` | 00:00, the start of that day |
| `--due-before` | 23:59:59, the end of that day |

To set a specific time, give a timestamp: `--defer 2026-10-01T06:00`.

### Failures

A command that fails exits non-zero. With `--json` it still prints its result
on stdout, with `"success": false` and an `error` string or an `errors` list.
When a date or a name in the command is rejected, nothing is created or
modified.

### `of summary`

Show a summary of the database.

### `of list inbox`

List tasks in the Inbox.

**Aliases:** `ls i`

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--all`, `-a` (boolean): Include completed
- `--brief` (boolean): Brief output
- `--full` (boolean): Full output

**Examples:**

```bash
of list inbox
```

```bash
of ls i --limit 10
```

### `of list today`

List tasks due or available today.

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--flagged` (boolean): Include flagged
- `--brief` (boolean): Brief output
- `--full` (boolean): Full output

### `of list flagged`

List all flagged tasks.

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--all`, `-a` (boolean): Include completed
- `--brief` (boolean): Brief output
- `--full` (boolean): Full output

### `of list forecast`

List tasks for upcoming days.

**Options:**

- `--days`, `-d` (number): Number of days to show

### `of search`

Search for tasks by name, note, or filters.

**Aliases:** `s`

**Arguments:**

- `query` (string): Search query

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--all`, `-a` (boolean): Include completed tasks
- `--project`, `-p` (string): Filter by project
- `--tag`, `-t` (string): Filter by tag
- `--flagged`, `-f` (boolean): Only flagged tasks
- `--available` (boolean): Only available tasks
- `--due-before` (date): Due on or before date (a bare date includes that whole day)
- `--due-after` (date): Due on or after date (a bare date includes that whole day)

### `of list projects`

List all active projects.

**Aliases:** `ls p`

**Options:**

- `--folder`, `-f` (string): Filter by folder name or ID
- `--limit`, `-l` (number): Maximum results
- `--all`, `-a` (boolean): Include completed/dropped/on-hold
- `--on-hold` (boolean): Include on-hold projects
- `--brief` (boolean): Brief output
- `--full` (boolean): Full output

### `of list folders`

List folder hierarchy.

**Aliases:** `ls f`

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--folder`, `-f` (string): List subfolders within this folder
- `--root-only`, `-r` (boolean): Only show top-level folders
- `--hidden` (boolean): Include hidden folders

### `of list tags`

List all tags.

**Aliases:** `ls t`

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--hidden` (boolean): Include hidden tags

### `of tag tasks`

List tasks with a specific tag.

**Aliases:** `tag list`

**Arguments:**

- `name` (idOrName): Tag name or ID

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--all`, `-a` (boolean): Include completed tasks

### `of add`

Add a new task.

**Aliases:** `add t`, `add task`

**Arguments:**

- `name` (string): Task name

**Options:**

- `--project`, `-p` (string): Project name or ID
- `--note`, `-n` (string): Task note
- `--due`, `-d` (date): Due date
- `--defer` (date): Defer date
- `--planned` (date): Planned date (when work is intended)
- `--flagged`, `-f` (boolean): Mark as flagged
- `--tag`, `-t` (string): Primary tag
- `--tags` (string[]): Multiple tags (comma-sep)
- `--estimate`, `-e` (number): Estimated minutes

### `of quick`

Quick add to Inbox.

**Aliases:** `q`

**Arguments:**

- `name` (string): Task name

**Options:**

- `--due`, `-d` (date): Due date
- `--flagged`, `-f` (boolean): Mark as flagged

### `of add batch`

Create projects and tasks from an indented outline via stdin.

**Aliases:** `add b`

**Options:**

- `--folder`, `-f` (string): Add to specific folder
- `--sequential` (boolean): Make all projects sequential

### `of modify`

Update an existing task.

**Aliases:** `mod`

**Arguments:**

- `id` (id): Task ID

**Options:**

- `--name` (string): Set task name
- `--note`, `-n` (string): Set task note
- `--due`, `-d` (date): Set due date
- `--due-by` (string): Adjust due date relatively (+3d, -1w)
- `--defer` (date): Set defer date
- `--defer-by` (string): Adjust defer date relatively
- `--planned` (date): Set planned date (use "" to clear)
- `--planned-by` (string): Adjust planned date relatively
- `--flag`, `-f` (boolean): Set flagged
- `--unflag` (boolean): Remove flag
- `--tag`, `-t` (string): Set primary tag
- `--project`, `-p` (string): Move to project
- `--estimate`, `-e` (number): Set estimated minutes

### `of flag`

Flag task(s).

**Arguments:**

- `ids...` (id[]): Task IDs

### `of unflag`

Remove flag from task(s).

**Arguments:**

- `ids...` (id[]): Task IDs

### `of complete`

Mark task(s) as complete.

**Aliases:** `done`

**Arguments:**

- `ids...` (id[]): Task IDs

### `of drop`

Drop task(s).

**Arguments:**

- `ids...` (id[]): Task IDs

### `of delete`

Permanently delete task(s).

**Aliases:** `rm`

**Arguments:**

- `ids...` (id[]): Task IDs

### `of reorder`

Reorder a task within its project.

**Arguments:**

- `taskId` (id): Task ID

**Options:**

- `--top` (boolean): Move to first position
- `--bottom` (boolean): Move to last position
- `--before` (string): Move before another task
- `--after` (string): Move after another task

### `of add project`

Create a new project.

**Aliases:** `add p`

**Arguments:**

- `name` (string): Project name

**Options:**

- `--folder`, `-f` (string): Add to specific folder
- `--note`, `-n` (string): Project note
- `--due`, `-d` (date): Due date
- `--defer` (date): Defer date
- `--flagged` (boolean): Mark as flagged
- `--tag`, `-t` (string): Add primary tag
- `--tasks` (string[]): Initial tasks (comma-sep)
- `--sequential` (boolean): Sequential project
- `--parallel` (boolean): Parallel project
- `--single-actions` (boolean): Single action list

### `of project modify`

Modify project properties.

**Aliases:** `proj mod`

**Arguments:**

- `id` (id): Project ID

**Options:**

- `--name` (string): Rename project
- `--note`, `-n` (string): Set project note
- `--due`, `-d` (date): Set due date
- `--defer` (date): Set defer date
- `--clear-due` (boolean): Clear due date
- `--clear-defer` (boolean): Clear defer date
- `--review-interval` (string): Review cadence `<n><d|w|m|y>` (e.g. 1w, 2m)
- `--flag`, `-f` (boolean): Flag project
- `--unflag` (boolean): Unflag project
- `--tag`, `-t` (string): Set primary tag
- `--status` (string): Set status (active, on-hold, done, dropped)
- `--sequential` (boolean): Set to sequential
- `--parallel` (boolean): Set to parallel

### `of project complete`

Mark project as complete.

**Aliases:** `proj done`

**Arguments:**

- `id` (id): Project ID

### `of project drop`

Mark project as dropped.

**Arguments:**

- `id` (id): Project ID

### `of project hold`

Put project on hold.

**Aliases:** `pause`

**Arguments:**

- `idOrName` (idOrName): Project name or ID

### `of project activate`

Resume an on-hold project.

**Aliases:** `resume`

**Arguments:**

- `idOrName` (idOrName): Project name or ID

### `of project review`

Mark project as reviewed.

**Arguments:**

- `id` (id): Project ID

### `of move`

Move a project to a different folder.

**Arguments:**

- `projectId` (id): Project ID

**Options:**

- `--folder`, `-f` (string): Target folder (omit for root)

### `of folder add`

Create a new folder.

**Aliases:** `folder create`

**Arguments:**

- `name` (string): Folder name

**Options:**

- `--parent`, `-p` (string): Parent folder ID

### `of folder modify`

Modify an existing folder.

**Aliases:** `folder mod`

**Arguments:**

- `id` (id): Folder ID

**Options:**

- `--name` (string): Rename folder
- `--note` (string): Set folder note
- `--hidden` (boolean): Hide folder
- `--visible` (boolean): Show folder


### `of folder delete`

Delete folder(s). Deletes every project, task and subfolder inside, permanently.

Args: `nameOrIds...` (one or more folder names or IDs)

- `--force` (boolean): Delete even if the folder is non-empty
- `--dry-run` (boolean): Preview, reporting contents, without deleting

Empty folders delete directly; non-empty ones are refused unless `--force`.
A refused delete removes nothing.

### `of tag add`

Create a new tag.

**Aliases:** `tag create`

**Arguments:**

- `name` (string): Tag name

**Options:**

- `--parent`, `-p` (string): Parent tag ID
- `--no-next-action` (boolean): Disable next action

### `of tag modify`

Modify an existing tag.

**Aliases:** `tag mod`

**Arguments:**

- `id` (id): Tag ID

**Options:**

- `--name` (string): Rename tag
- `--hidden` (boolean): Hide tag
- `--visible` (boolean): Show tag
- `--allows-next` (boolean): Enable next action
- `--no-allows-next` (boolean): Disable next action

### `of tag delete`

Delete a tag.

**Aliases:** `tag rm`

**Arguments:**

- `id` (id): Tag ID

### `of sync`

Synchronize the database.

### `of review`

List projects due for review.

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--all`, `-a` (boolean): Include all active projects

### `of get task`

Get detailed information about a task.

**Aliases:** `get t`

**Arguments:**

- `id` (id): Task ID

### `of get project`

Get detailed information about a project.

**Aliases:** `get p`

**Arguments:**

- `idOrName` (idOrName): Project name or ID

### `of get project-tasks`

List tasks in a project.

**Aliases:** `get pt`

**Arguments:**

- `projectId` (id): Project ID

**Options:**

- `--limit`, `-l` (number): Maximum results
- `--all`, `-a` (boolean): Include completed tasks

### `of perspectives`

List available perspectives.

**Aliases:** `persp`

### `of qe`

Open Quick Entry panel.

**Aliases:** `quick-entry`

**Arguments:**

- `name` (string): Task name

**Options:**

- `--note`, `-n` (string): Task note
- `--due`, `-d` (date): Due date
- `--defer` (date): Defer date
- `--flagged`, `-f` (boolean): Mark as flagged
- `--save` (boolean): Auto-save the task

