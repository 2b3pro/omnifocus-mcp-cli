# OmniFocus CLI - Gap Analysis

Updated: 2026-01-08 (after P1/P2 implementation)

## Status Summary

| Priority | Category | Status |
|----------|----------|--------|
| P1 | Folder Operations | ✅ Implemented |
| P1 | Project Lifecycle | ✅ Implemented |
| P1 | Tag Management | ✅ Implemented |
| P2 | Enhanced Search | ✅ Implemented |
| P2 | Relative Date Operations | ✅ Implemented |
| P2 | Review Workflow | ✅ Implemented |
| P3 | Recurring Tasks | ⏳ Not implemented |
| P3 | Attachments | ⏳ Not implemented |
| P3 | Output Formats | ⏳ Not implemented |

---

## Completed Features

### P1: Folder Operations ✅

```bash
of folder add "Work"                    # Create folder
of folder add "Clients" --parent "Work" # Nested folder
of folder modify "Work" --name "Job"    # Rename
of move "Project" --folder "Work"       # Move project to folder
of move "Project"                       # Move to root (no folder)
```

### P1: Project Lifecycle ✅

```bash
of project complete "Done Project"      # Mark complete
of project drop "Cancelled"             # Mark dropped
of project hold "Paused"                # Put on hold
of project activate "Paused"            # Resume from hold
of project review "Weekly Review"       # Mark as reviewed
of project modify "X" --status active   # Change status
of project modify "X" --flag --due "+7d"
```

### P1: Tag Management ✅

```bash
of tag add "Urgent"                     # Create tag
of tag add "Errands" --parent "Personal" # Nested tag
of tag add "Waiting" --no-next-action   # No next action tag
of tag tasks "Work"                     # List tasks by tag
of tag modify "Old" --name "New"        # Rename
of tag delete "Unused"                  # Delete
```

### P2: Enhanced Search ✅

```bash
of search "meeting"                     # Text search
of search --project "Work"              # Filter by project
of search --tag "Urgent"                # Filter by tag
of search --flagged                     # Only flagged
of search --available                   # Not blocked/deferred
of search --due-before "tomorrow"       # Due date filter
of search --due-after "today"           # Due date filter
of search "query" --project "X" --tag "Y" # Combined
```

### P2: Relative Date Operations ✅

```bash
of modify ID --due-by "+3d"             # Push due 3 days
of modify ID --due-by "-1w"             # Pull due 1 week earlier
of modify ID --defer-by "+2m"           # Push defer 2 months
of modify ID --due ""                   # Clear due date
of modify ID --defer ""                 # Clear defer date
```

### P2: Review Workflow ✅

```bash
of review                               # Projects due for review
of review --all                         # All with review status
of review --limit 10                    # Limit results
of project review "Name"                # Mark as reviewed
```

---

## Remaining Gaps (P3)

### 1. Folder Deletion
- **Status**: Not implemented
- **Reason**: May leave orphaned projects; safer to do in UI
- **Workaround**: Delete manually in OmniFocus

### 2. Recurring Tasks
- **Status**: Not implemented
- **JXA Feasibility**: ✅ Via `repetitionRule` property
- **Proposed**:
  ```bash
  of add task "Daily" --repeat "daily"
  of add task "Weekly" --repeat "weekly:mon,fri"
  ```

### 3. Attachment Support
- **Status**: Not implemented
- **JXA Feasibility**: ⚠️ Limited
- **Note**: May require OmniFocus URL scheme approach

### 4. Output Formats
- **Status**: Only JSON/pretty/quiet/human
- **Missing**: CSV, TaskPaper, custom templates
- **Proposed**:
  ```bash
  of list projects --csv
  of list tasks --format "{{name}}: {{dueDate}}"
  ```

### 5. Perspective Task Listing
- **Status**: Can list perspectives, cannot show tasks
- **Reason**: Perspectives are UI-bound in OmniFocus
- **Workaround**: Use `of search` with filters

### 6. Bulk Operations
- **Status**: Single-item operations only
- **Missing**: Bulk tag assignment, bulk date changes
- **Workaround**: Shell scripting with `xargs`

---

## Test Coverage

| Phase | Feature | Test Count |
|-------|---------|------------|
| 1 | Setup & Verification | 5 |
| 2 | Folder Operations | 8 |
| 3 | Tag Operations | 9 |
| 4 | Project Creation | 8 |
| 5 | Project Lifecycle | 9 |
| 6 | Task Creation | 4 |
| 7 | Views & Perspectives | 5 |
| 8 | Quick Entry & Inbox | 3 |
| 9 | Modify & Relative Dates | 12 |
| 10 | Enhanced Search | 10 |
| 11 | Review Workflow | 5 |
| 12 | Complete/Drop/Delete | 8 |
| 13 | Sync & Misc | 3 |
| 14 | Error Handling | 5 |
| 15 | Cleanup | 3 |
| **Total** | | **~100 tests** |

---

## Running Tests

```bash
# All tests
npm test

# Specific phase
npm test -- --test-name-pattern="Phase 5"

# Watch mode
npm run test:watch

# Verbose output
npm test -- --test-reporter=spec
```

---

## JXA Implementation Notes

### What Works Well
- Folder/tag/project creation via `push()`
- Property modifications (name, note, dates, flags)
- Status changes for projects
- Tag assignment and deletion
- Date parsing with relative formats

### Known Limitations
1. **Project deletion** - Must use `drop` or `complete` instead
2. **Perspectives** - UI-bound, cannot query tasks
3. **Attachments** - Very limited API
4. **Custom perspectives** - Cannot create via scripting
