# OmniFocus CLI (`of`) — Complete Reference

> CLI for OmniFocus 4 on macOS. Wraps JXA scripts for fast, scriptable task management.

---

## Global Flags

These flags work with most commands:

| Flag | Short | Description |
|------|-------|-------------|
| `--json` | `-j` | Output as JSON |
| `--pretty` | | Pretty-print JSON output |
| `--quiet` | `-q` | Output only IDs (for piping) |
| `--help` | `-h` | Show command help |

---

## List Commands

### `of list inbox`

List tasks in the Inbox.

```bash
# Basic usage
of list inbox

# JSON output
of list inbox --json

# IDs only (for piping to other commands)
of list inbox -q

# Limit results
of list inbox --limit 10

# Include completed tasks
of list inbox --all
```

### `of list today`

List tasks due or available today.

```bash
# Basic usage
of list today

# JSON for scripting
of list today --json

# Just the IDs
of list today -q
```

### `of list flagged`

List all flagged tasks.

```bash
# Basic usage
of list flagged

# Limit to top 5
of list flagged --limit 5

# JSON output
of list flagged --json --pretty
```

### `of list projects`

List all active projects.

```bash
# Basic usage
of list projects

# Include completed/dropped projects
of list projects --all

# JSON output
of list projects --json
```

### `of list folders`

List folder hierarchy.

```bash
# Basic usage
of list folders

# JSON output
of list folders --json
```

### `of list tags`

List all tags.

```bash
# Basic usage
of list tags

# JSON output
of list tags --json
```

### `of list forecast`

List tasks for upcoming days.

```bash
# Default: next 7 days
of list forecast

# Custom range
of list forecast --days 14

# JSON output
of list forecast --json
```

---

## Add Commands

### `of add "<task>"`

Add a new task.

**Syntax:**
```bash
of add "<task name>" [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--project "<name>"` | Assign to project |
| `--folder "<name>"` | Assign to folder (for projects) |
| `--due "<date>"` | Set due date |
| `--defer "<date>"` | Set defer date |
| `--tag "<name>"` | Add tag |
| `--flagged` | Mark as flagged |
| `--note "<text>"` | Add note |
| `--estimate "<duration>"` | Set time estimate |

**Date formats:** `today`, `tomorrow`, `+3d`, `+1w`, `2026-01-15`, `next monday`

**Examples:**

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

# Task with note
of add "Call dentist" --note "Ask about cleaning schedule"

# Task with time estimate
of add "Write blog post" --estimate "2h"

# Full example
of add "Review contract" \
  --project "Legal" \
  --due tomorrow \
  --tag "High Priority" \
  --flagged \
  --note "Check section 4.2"
```

### `of quick "<task>"`

Quick add to Inbox (minimal options, fast).

```bash
# Basic quick add
of quick "Call mom"

# Quick add with flag
of quick "Urgent task" --flagged
```

### `of add project "<name>"`

Create a new project.

**Options:**

| Option | Description |
|--------|-------------|
| `--folder "<name>"` | Place in folder |
| `--tasks "<csv>"` | Comma-separated initial tasks |
| `--due "<date>"` | Project due date |
| `--note "<text>"` | Project note |
| `--sequential` | Sequential project (vs parallel) |
| `--review "<interval>"` | Review interval (e.g., `1w`, `2w`) |

**Examples:**

```bash
# Simple project
of add project "Home Renovation"

# Project in folder
of add project "Q1 Marketing" --folder "Work"

# Project with initial tasks
of add project "Launch Website" \
  --folder "Work" \
  --tasks "Design mockups,Build frontend,Deploy to production"

# Sequential project (tasks must be done in order)
of add project "Onboarding" --sequential

# Project with review interval
of add project "Weekly Review" --review "1w"
```

### Bulk Add from stdin

Pipe tasks from a file or command.

```bash
# From file (one task per line)
cat tasks.txt | of add --project "Work"

# From echo
echo -e "Task 1\nTask 2\nTask 3" | of add --project "Inbox"

# With options applied to all
cat tasks.txt | of add --project "Work" --due "+1w" --tag "Batch"
```

### `of add batch`

Create projects and tasks from an indented outline.

**Input format:**
```
- Project Name
  - Task 1
  - Task 2
    - Subtask 2.1
- Another Project
  - Task A
```

**Examples:**

```bash
# From file
cat outline.md | of add batch --folder "2026 Goals"

# Inline
echo "- My Project
  - First task
  - Second task" | of add batch
```

---

## Modify Commands

### `of modify <task-id>`

Update an existing task.

**Options:**

| Option | Description |
|--------|-------------|
| `--name "<text>"` | Rename task |
| `--project "<name>"` | Move to project |
| `--due "<date>"` | Change due date |
| `--defer "<date>"` | Change defer date |
| `--tag "<name>"` | Add tag |
| `--flagged` | Set flagged |
| `--unflagged` | Remove flag |
| `--note "<text>"` | Update note |
| `--order <n>` | Reorder within project |

**Examples:**

```bash
# Change due date
of modify abc123 --due "+3d"

# Move to different project
of modify abc123 --project "Different Project"

# Flag a task
of modify abc123 --flagged

# Unflag a task
of modify abc123 --unflagged

# Rename task
of modify abc123 --name "Updated task name"

# Move to first position in project
of modify abc123 --order 0

# Multiple changes
of modify abc123 --due tomorrow --flagged --tag "Urgent"
```

### `of project modify <project-id>`

Update an existing project.

**Options:**

| Option | Description |
|--------|-------------|
| `--name "<text>"` | Rename project |
| `--status "<status>"` | Set status: `active`, `on-hold`, `completed`, `dropped` |
| `--folder "<name>"` | Move to folder |
| `--due "<date>"` | Change due date |
| `--review "<interval>"` | Change review interval |

**Examples:**

```bash
# Put project on hold
of project modify proj123 --status on-hold

# Reactivate project
of project modify proj123 --status active

# Move project to folder
of project modify proj123 --folder "Archive"

# Rename project
of project modify proj123 --name "New Project Name"
```

---

## Complete Commands

### `of complete <task-id>`

Mark a task as complete.

```bash
# Complete a task
of complete abc123

# Complete multiple tasks
of complete abc123 def456 ghi789
```

### `of complete <task-id> --drop`

Drop a task (mark as abandoned, not completed).

```bash
of complete abc123 --drop
```

### `of complete <task-id> --delete`

Permanently delete a task.

```bash
of complete abc123 --delete
```

### Bulk Complete

```bash
# Complete all inbox tasks
of list inbox -q | xargs -I {} of complete {}

# Complete all flagged tasks
of list flagged -q | xargs -I {} of complete {}

# Complete with confirmation (one by one)
of list inbox -q | while read id; do
  of get task "$id"
  read -p "Complete? (y/n) " confirm
  [[ $confirm == "y" ]] && of complete "$id"
done
```

---

## Organization Commands

### `of folder add "<name>"`

Create a new folder.

```bash
# Create folder
of folder add "Personal Projects"

# Create nested folder (if supported)
of folder add "Q1" --parent "2026"
```

### `of tag add "<name>"`

Create a new tag.

```bash
# Create tag
of tag add "Waiting For"

# Create nested tag
of tag add "Home" --parent "Contexts"
```

### `of project move <project-id>`

Move a project to a different folder.

```bash
of project move proj123 --folder "Archive"
```

### `of review`

List projects due for review.

```bash
# Show projects needing review
of review

# JSON output
of review --json

# Mark project as reviewed
of review mark proj123
```

---

## Utility Commands

### `of sync`

Trigger OmniFocus sync.

```bash
of sync
```

### `of get task <id>`

Get detailed information about a task.

```bash
# Human readable
of get task abc123

# JSON output
of get task abc123 --json
```

### `of get project <id>`

Get detailed information about a project.

```bash
of get project proj123 --json
```

### `of search "<query>"`

Search for tasks by name/note content.

```bash
# Basic search
of search "meeting"

# Limit results
of search "report" --limit 10

# JSON output
of search "client" --json

# Search in specific project
of search "review" --project "Work"
```

### `of completion <shell>`

Generate shell completion scripts.

```bash
# Bash
of completion bash >> ~/.bashrc

# Zsh
of completion zsh >> ~/.zshrc

# Fish
of completion fish >> ~/.config/fish/completions/of.fish
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
of list flagged --json | jq '.[] | select(.dueDate == null)'
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

### Export Tasks to JSON

```bash
# Export inbox to file
of list inbox --json --pretty > inbox-backup.json

# Export all projects
of list projects --json --pretty > projects.json
```

### Integrate with Other Tools

```bash
# Create task from clipboard
pbpaste | of add --project "Inbox"

# Create task from selection (macOS)
osascript -e 'tell application "System Events" to keystroke "c" using command down'
sleep 0.1
pbpaste | of add

# Send completed tasks to a log file
of list today --all --json | jq '.[] | select(.completed == true)' >> ~/completed-log.json
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

## Tips

1. **Use `-q` for scripting** — Returns only IDs, perfect for piping
2. **Use `--json` for parsing** — Structured data for `jq` processing
3. **Relative dates** — `+3d`, `+1w`, `tomorrow`, `next monday`
4. **Dry run** — Add `--dry-run` to preview changes without executing
5. **Combine with Unix tools** — `grep`, `xargs`, `jq`, `wc` all work great

---

## Quick Reference Card

```
LIST:     of list inbox|today|flagged|projects|folders|tags|forecast
ADD:      of add "task" [--project X] [--due DATE] [--tag X] [--flagged]
QUICK:    of quick "task"
MODIFY:   of modify <id> [--due DATE] [--project X] [--flagged]
COMPLETE: of complete <id> [--drop|--delete]
SEARCH:   of search "query" [--limit N]
SYNC:     of sync
GET:      of get task|project <id>

FLAGS:    --json  --pretty  --quiet/-q  --limit N  --all
DATES:    today  tomorrow  +3d  +1w  2026-01-15  "next monday"
```
