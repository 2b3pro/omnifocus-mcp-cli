---
title: OmniFocus CLI Reference
description: Complete command reference for the OmniFocus CLI (`of`) on macOS
version: 0.1.0
updated: 2026-01-12
author: Ian Shen
contextPrimers:
  - OmniFocus
  - CLI
---

# OmniFocus CLI (`of`) — Complete Reference

> CLI for OmniFocus 4 on macOS. Wraps JXA scripts for fast, scriptable task management.

---

## Global Flags

These flags work with most commands:

| Flag | Short | Description |
|------|-------|-------------|
| `--json` | | Output as JSON |
| `--pretty` | | Pretty-print JSON output |
| `--quiet` | `-q` | Output only IDs (for piping) |
| `--dry-run` | | Preview without executing (write commands) |
| `--help` | `-h` | Show command help |

---

## Dates: four distinct levers

OmniFocus has four scheduling concepts. They are not interchangeable, and
using one to mean another is the most common way a task list goes stale.

| Lever | OmniFocus's meaning | Use it for | CLI |
|-------|---------------------|-----------|-----|
| **Defer** | when the item becomes *available* | blocked-until-prereq, "don't surface until X" | `--defer`, `--defer-by` |
| **Planned** | "the date at which work is *intended*" | "I mean to get to this Thursday" on something already actionable | `--planned`, `--planned-by` |
| **Due** | a real deadline | genuine consequence if missed | `--due`, `--due-by` |
| **Review interval** | project re-examination cadence | deciding what `of review` surfaces | `--review-interval` (projects) |

Notes:

- **Planned is not defer.** Deferring something to express intent hides it from
  the Available list, which is wrong when the work *could* be done now. Defer
  answers "can I?"; planned answers "will I?".
- **Due is not a priority proxy.** Fake deadlines erode the due list until real
  ones stop registering. Use the flag for urgency instead.
- Date arguments accept `today`, `tomorrow`, `+3d`, `2026-01-15`.
- Relative `--*-by` offsets accept `<±n><d|w|m>` and adjust the *existing*
  value (falling back to now if unset).
- Pass `""` to clear a date: `of modify abc123 --planned ""`.
- Planned date requires a recent OmniFocus (verified on 4.8.12). On older
  versions it reads back as `null` rather than erroring.

---

## List Commands

### `of list inbox` (alias: `ls i`)

List tasks in the Inbox.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 100) |
| `-a, --all` | Include completed tasks |
| `--brief` | Brief output (faster, fewer details) [default] |
| `--full` | Full output with all task details |

```bash
of list inbox                    # List inbox tasks (brief mode)
of ls i --limit 10               # First 10 inbox tasks
of list inbox --all              # Include completed tasks
of list inbox --full             # Full details (slower)
of list inbox -q | xargs of complete  # Complete all inbox tasks
```

### `of list today`

List tasks due or available today.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 100) |
| `--flagged` | Include flagged tasks |
| `--brief` | Brief output [default] |
| `--full` | Full output |

```bash
of list today                    # Tasks due/available today
of list today --flagged          # Include all flagged tasks
of list today -q | wc -l         # Count today's tasks
```

### `of list flagged`

List all flagged tasks.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 100) |
| `-a, --all` | Include completed tasks |
| `--brief` | Brief output [default] |
| `--full` | Full output |

```bash
of list flagged                  # List flagged tasks
of list flagged --limit 5        # Top 5 flagged tasks
of list flagged --full --pretty  # Full details, formatted
```

### `of list projects` (alias: `ls p`)

List all active projects.

| Option | Description |
|--------|-------------|
| `-f, --folder <name>` | Filter by folder name or ID |
| `-l, --limit <n>` | Maximum results (default: 100) |
| `-a, --all` | Include completed/dropped/on-hold projects |
| `--on-hold` | Include on-hold projects |
| `--brief` | Brief output (faster) |
| `--full` | Full output |

```bash
of list projects                 # List active projects
of ls p --folder "Work"          # Projects in a folder
of list projects --all           # Include completed/dropped
of list projects --on-hold       # Include paused projects
of list projects -q              # Just IDs (for scripting)
```

### `of list folders` (alias: `ls f`)

List folder hierarchy.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 100) |
| `-f, --folder <name>` | List subfolders within this folder |
| `-r, --root-only` | Only show top-level folders |
| `--hidden` | Include hidden folders |

```bash
of list folders                  # List all folders
of ls f --root-only              # Only top-level folders
of list folders -f "Work"        # Subfolders of "Work"
of list folders --hidden         # Include hidden folders
```

### `of list tags` (alias: `ls t`)

List all tags.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 100) |
| `--hidden` | Include hidden tags |

```bash
of list tags                     # List all tags
of ls t --hidden                 # Include hidden tags
of list tags -q                  # Just IDs
```

### `of list forecast`

List tasks for upcoming days.

| Option | Description |
|--------|-------------|
| `-d, --days <n>` | Number of days to show (default: 7) |

```bash
of list forecast                 # Next 7 days
of list forecast --days 14       # Next 2 weeks
of list forecast --days 1        # Just tomorrow
of list forecast --json          # JSON for scripting
```

---

## Add Commands

### `of add [task] [name]` (alias: `of add t`)

Add a new task. Default command under `of add`.

| Option | Description |
|--------|-------------|
| `-p, --project <name>` | Add to specific project (default: inbox) |
| `-n, --note <text>` | Task note |
| `-d, --due <date>` | Due date |
| `--defer <date>` | Defer/start date |
| `--planned <date>` | Planned date — when work is intended |
| `-f, --flagged` | Mark as flagged |
| `-t, --tag <name>` | Add primary tag |
| `--tags <names>` | Add multiple tags (comma-separated) |
| `-e, --estimate <minutes>` | Estimated time in minutes |
| `--dry-run` | Preview without creating |

**Date formats:** `today`, `tomorrow`, `+3d`, `+1w`, `2026-01-15`, `next week`

```bash
# Simple task (goes to Inbox)
of add "Buy groceries"

# Task with project
of add "Draft proposal" --project "Work"

# Task with due date
of add "Pay rent" --due "2026-01-31"

# Task due in 3 days
of add "Follow up with client" --due "+3d"

# Flagged task with tag
of add "Urgent review" --flagged --tag "Work"

# Task with defer and due
of add "Quarterly report" --defer "2026-03-01" --due "2026-03-15"

# Full example
of add "Review contract" \
  --project "Legal" \
  --due tomorrow \
  --tag "High Priority" \
  --flagged \
  --note "Check section 4.2"

# Bulk add from stdin:
cat tasks.txt | of add --project "Work"
echo -e "Task 1\nTask 2" | of add
```

### `of quick <name>` (alias: `q`)

Quick add to Inbox (minimal options, fast).

| Option | Description |
|--------|-------------|
| `-d, --due <date>` | Due date |
| `-f, --flagged` | Mark as flagged |

```bash
of quick "Call mom"
of q "Urgent task" --flagged
```

### `of add project <name>` (alias: `of add p`)

Create a new project.

| Option | Description |
|--------|-------------|
| `-f, --folder <name>` | Add to specific folder |
| `-n, --note <text>` | Project note |
| `-d, --due <date>` | Due date |
| `--defer <date>` | Defer/start date |
| `--flagged` | Mark as flagged |
| `-t, --tag <name>` | Add primary tag |
| `--tasks <list>` | Tasks to add (comma-separated) |
| `--sequential` | Sequential project |
| `--parallel` | Parallel project |
| `--single-actions` | Single action list |
| `--dry-run` | Preview without creating |

```bash
# Simple project
of add project "Home Renovation"

# Project in folder
of add project "Q1 Marketing" --folder "Work"

# Project with initial tasks
of add project "Launch Website" \
  --folder "Work" \
  --tasks "Design mockups,Build frontend,Deploy to production"

# Sequential project
of add project "Onboarding" --sequential

# Pipe tasks from stdin:
cat tasks.txt | of add project "New Project"
echo -e "Task 1\nTask 2\nTask 3" | of add project "Quick Project"
```

### `of add batch` (alias: `of add b`)

Create projects and tasks from an indented outline via stdin.

| Option | Description |
|--------|-------------|
| `-f, --folder <name>` | Add all projects to existing folder |
| `-c, --create-folder <name>` | Create new folder for all projects |
| `--sequential` | Make all projects sequential |
| `--dry-run` | Preview without creating |

**Input format:**
```
- Project Name
  - Task 1
  - Task 2
- Another Project
  - Task A
```

```bash
cat outline.md | of add batch --folder "2026 Goals"
pbpaste | of add batch --dry-run
```

---

## Modify Commands

### `of modify <taskId>` (alias: `mod`)

Update an existing task.

| Option | Description |
|--------|-------------|
| `--name <name>` | Set task name |
| `-n, --note <text>` | Set task note |
| `-d, --due <date>` | Set due date (use "" to clear) |
| `--due-by <offset>` | Adjust due date relatively (+3d, -1w) |
| `--defer <date>` | Set defer date (use "" to clear) |
| `--defer-by <offset>` | Adjust defer date relatively |
| `--planned <date>` | Set planned date (use "" to clear) |
| `--planned-by <offset>` | Adjust planned date relatively |
| `-f, --flag` | Set flagged |
| `--unflag` | Remove flag |
| `-t, --tag <name>` | Set primary tag (use "" to clear) |
| `-p, --project <name>` | Move to project |
| `-e, --estimate <minutes>` | Set estimated time |
| `--dry-run` | Preview without modifying |

```bash
of modify abc123 --due tomorrow
of modify abc123 --name "Updated task name" --flag
of modify abc123 --project "Work" --tag "Urgent"
of modify abc123 --due "" --defer ""   # Clear dates
of modify abc123 --due-by "+3d"        # Extend due by 3 days
```

### `of flag <taskIds...>`

Flag task(s).

```bash
of flag abc123                         # Flag single task
of flag abc123 def456 ghi789           # Flag multiple tasks
of list inbox -q | xargs of flag       # Flag all inbox tasks
```

### `of unflag <taskIds...>`

Remove flag from task(s).

```bash
of unflag abc123
of list flagged -q | xargs of unflag   # Unflag all flagged tasks
```

### `of reorder <taskId>`

Reorder a task within its project.

| Option | Description |
|--------|-------------|
| `--top` | Move to first position |
| `--bottom` | Move to last position |
| `--before <targetId>` | Move before another task |
| `--after <targetId>` | Move after another task |
| `--dry-run` | Preview without reordering |

```bash
of reorder abc123 --top                  # Move to first position
of reorder abc123 --bottom               # Move to last position
of reorder abc123 --before def456        # Move before another task
of reorder abc123 --after def456         # Move after another task
```

---

## Complete/Drop/Delete Commands

### `of complete <taskIds...>` (alias: `done`)

Mark task(s) as complete.

```bash
of complete abc123                     # Complete single task
of complete abc123 def456 ghi789       # Complete multiple tasks
of done abc123                         # Using alias
of list inbox -q | xargs of complete   # Complete all inbox tasks
```

### `of drop <taskIds...>`

Drop task(s) (mark as abandoned, not completed).

```bash
of drop abc123
of drop abc123 def456
```

### `of delete <taskIds...>` (alias: `rm`)

Permanently delete task(s).

```bash
of delete abc123
of rm abc123 def456                    # Using alias
```

---

## Project Commands

### `of project complete <nameOrId>` (alias: `proj done`)

Mark project as complete.

```bash
of project complete "My Project"       # Complete by name
of proj done abc123                    # Complete by ID
```

### `of project drop <nameOrId>`

Mark project as dropped.

```bash
of project drop "Old Project"
```

### `of project hold <nameOrId>` (alias: `pause`)

Put project on hold.

```bash
of project hold "Paused Project"
of proj pause "Work"                   # Using alias
```

### `of project activate <nameOrId>` (alias: `resume`)

Resume an on-hold project.

```bash
of project activate "Paused Project"
of proj resume "Work"
```

### `of project review <nameOrId>`

Mark project as reviewed.

```bash
of project review "Work"
```

### `of project modify <nameOrId>` (alias: `proj mod`)

Modify project properties.

| Option | Description |
|--------|-------------|
| `--name <name>` | Rename project |
| `-n, --note <text>` | Set project note |
| `-d, --due <date>` | Set due date |
| `--defer <date>` | Set defer date |
| `--clear-due` | Clear due date |
| `--clear-defer` | Clear defer date |
| `--review-interval <interval>` | Set review cadence: `<n><d\|w\|m\|y>` (e.g. `1w`, `2m`) |
| `-f, --flag` | Flag project |
| `--unflag` | Unflag project |
| `--sequential` | Set to sequential |
| `--parallel` | Set to parallel |
| `-t, --tag <name>` | Set primary tag |
| `--status <status>` | Set status (active, on-hold, dropped) |
| `--dry-run` | Preview without modifying |

```bash
of project modify "My Project" --name "Renamed Project"
of project modify "Work" --due "+7d" --flag
of project modify "Paused" --status active
of project modify "SUPERNOVA" --review-interval 1w   # drives `of review`
of project modify "SUPERNOVA" --tag ""               # clear the primary tag
```

---

## Organization Commands

### `of folder add <name>` (alias: `create`)

Create a new folder.

| Option | Description |
|--------|-------------|
| `-p, --parent <name>` | Parent folder (default: root) |
| `--dry-run` | Preview without creating |

```bash
of folder add "Work"
of folder add "Clients" --parent "Work"
```

### `of folder modify <nameOrId>` (alias: `mod`)

Modify an existing folder.

| Option | Description |
|--------|-------------|
| `--name <name>` | Rename folder |
| `--note <text>` | Set folder note |
| `--hidden` | Hide folder |
| `--visible` | Show folder |

```bash
of folder modify "Work" --name "Career"
of folder modify "Personal" --hidden
```


### `of folder delete <nameOrIds...>` (alias: `rm`)

Delete folder(s). **Deleting a folder also deletes every project, task and
subfolder inside it, permanently.**

| Option | Description |
|--------|-------------|
| `--force` | Delete even if the folder contains projects or subfolders |
| `--dry-run` | Preview what would be deleted, including a count of its contents |

An empty folder deletes directly. A non-empty one is **refused** unless
`--force` is given, and the refusal reports exactly what it holds. A refused
delete removes nothing.

```bash
of folder delete "Old Folder"           # only if empty
of folder delete "Archive" --dry-run    # inspect contents first
of folder delete "Archive" --force      # delete it and everything inside
of folder rm "A" "B"                    # several at once
```

### `of move <projectNameOrId>`

Move a project to a different folder.

| Option | Description |
|--------|-------------|
| `-f, --folder <name>` | Target folder (omit for root) |
| `--dry-run` | Preview without moving |

```bash
of move "My Project" --folder "Work"
of move "Old Project" --folder ""        # Move to root
```

### `of tag add <name>` (alias: `create`)

Create a new tag.

| Option | Description |
|--------|-------------|
| `-p, --parent <name>` | Parent tag for nesting |
| `--no-next-action` | Disable next action (like "Waiting" tag) |
| `--dry-run` | Preview without creating |

```bash
of tag add "Work"
of tag add "Errands" --parent "Personal"
of tag add "Waiting" --no-next-action
```

### `of tag modify <nameOrId>` (alias: `mod`)

Modify an existing tag.

| Option | Description |
|--------|-------------|
| `--name <name>` | Rename tag |
| `--hidden` | Hide tag |
| `--visible` | Show tag |
| `--allows-next` | Enable next action |
| `--no-allows-next` | Disable next action |

```bash
of tag modify "Work" --name "Career"
of tag modify "Waiting" --no-allows-next
```

### `of tag delete <nameOrId>` (alias: `rm`)

Delete a tag.

```bash
of tag delete "Old Tag"
```

### `of tag tasks <nameOrId>` (alias: `list`)

List tasks with a specific tag.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 100) |
| `-a, --all` | Include completed tasks |

```bash
of tag tasks "Work"
of tag tasks "Urgent" --limit 10
of tag list "Review" --all --json
```

---

## Utility Commands

### `of sync`

Trigger OmniFocus sync.

```bash
of sync
```

### `of review`

List projects due for review.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 50) |
| `-a, --all` | Include all active projects |

```bash
of review                        # List projects due for review
of review --all                  # List all projects with review status
of review --json --limit 10      # JSON output with limit
```

### `of get task <id>` (alias: `t`)

Get detailed information about a task.

```bash
of get task abc123               # Human readable
of get t abc123 --json           # JSON output
```

### `of get project <nameOrId>` (alias: `p`)

Get detailed information about a project.

```bash
of get project "Work"            # Get by name
of get p abc123                  # Get by ID
```

### `of get project-tasks <nameOrId>` (alias: `pt`)

List tasks in a project.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 100) |
| `-a, --all` | Include completed tasks |

```bash
of get project-tasks "Work"
of get pt "Work" --all
of get pt "Work" -q | xargs of flag    # Flag all tasks in project
```

### `of search [query]` (alias: `s`)

Search for tasks by name, note, or filters.

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 50) |
| `-a, --all` | Include completed tasks |
| `-p, --project <name>` | Filter by project |
| `-t, --tag <name>` | Filter by tag |
| `-f, --flagged` | Only flagged tasks |
| `--available` | Only available tasks |
| `--due-before <date>` | Due before date |
| `--due-after <date>` | Due after date |

```bash
of search "meeting"                           # Text search
of search --project "Work"                    # All tasks in project
of search --tag "Urgent" --flagged            # Urgent flagged tasks
of search --due-before "tomorrow"             # Due soon
of search "report" --project "Q1" --tag "Review"  # Combined filters
of search --available --limit 20              # Next available tasks
```

### `of qe [name]` (alias: `quick-entry`)

Open Quick Entry panel (optionally with task).

| Option | Description |
|--------|-------------|
| `-n, --note <text>` | Task note |
| `-d, --due <date>` | Due date |
| `--defer <date>` | Defer date |
| `-f, --flagged` | Mark as flagged |
| `--save` | Auto-save the task |

```bash
of qe                               # Just open Quick Entry
of qe "New task"                    # Open with task pre-filled
of qe "Urgent task" --flagged       # Flagged task
of qe "Due task" --due tomorrow --save  # Create and save
```

### `of perspectives` (alias: `persp`)

List available perspectives.

```bash
of perspectives                     # List all perspectives
of persp --json                     # JSON output
```

### `of completion <shell>`

Generate shell completion scripts.

```bash
of completion bash >> ~/.bashrc
of completion zsh >> ~/.zshrc
```

---

## Common Workflows

### Daily Review

```bash
#!/bin/bash
echo "=== TODAY ==="
of list today

echo -e "\n=== FLAGGED ==="
of list flagged

echo -e "\n=== INBOX ($(of list inbox -q | wc -l | tr -d ' ') items) ==="
of list inbox --limit 5
```

### Process Inbox

```bash
# Move all inbox items to a processing project
of list inbox -q | while read id; do
  of modify "$id" --project "Processing"
done
```

### Weekly Review

```bash
#!/bin/bash
# Projects needing review
of review

# Forecast for next 2 weeks
of list forecast --days 14

# Stale flagged items
of list flagged --json | jq '.tasks[] | select(.dueDate == null)'
```

### Batch Create from Template

```bash
# template.txt
# - New Client: {{CLIENT}}
#   - Initial meeting
#   - Send proposal
#   - Follow up

CLIENT="Acme Corp"
sed "s/{{CLIENT}}/$CLIENT/g" template.txt | of add batch --folder "Clients"
```

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `OmniFocus not running` | App not open | Open OmniFocus.app |
| `Task not found` | Invalid ID | Verify ID with `of list` |
| `Project not found` | Typo in project name | Check exact name with `of list projects` |
| `Permission denied` | macOS permissions | Grant Automation permission in System Settings |

---

## Quick Reference Card

```
LIST:     of list inbox|today|flagged|projects|folders|tags|forecast
          of ls i|p|f|t (aliases)
ADD:      of add "task" [--project X] [--due DATE] [--tag X] [--flagged]
          of add project "name" [--folder X] [--tasks "a,b,c"]
          of add batch < outline.md
QUICK:    of quick "task" (shortcut for inbox)
MODIFY:   of modify <id> [--due DATE] [--project X] [--flag]
FLAG:     of flag <id>... | of unflag <id>...
REORDER:  of reorder <id> --top|--bottom|--before|--after <target>
COMPLETE: of complete <id>... | of drop <id>... | of delete <id>...
PROJECT:  of project complete|drop|hold|activate|review|modify <nameOrId>
FOLDER:   of folder add|modify <name>
TAG:      of tag add|modify|delete|tasks <name>
MOVE:     of move <project> --folder <folder>
SEARCH:   of search "query" [--project X] [--tag X] [--flagged]
GET:      of get task|project|project-tasks <id>
REVIEW:   of review [--all]
SYNC:     of sync
QE:       of qe [name] [--save]

FLAGS:    --json  --pretty  --quiet/-q  --limit N  --all  --dry-run
DATES:    today  tomorrow  +3d  +1w  2026-01-15  "next week"
```
