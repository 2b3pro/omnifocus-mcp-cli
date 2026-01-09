# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`omnifocus-cli` (`of`) is a CLI for OmniFocus 4 on macOS. It wraps JXA (JavaScript for Automation) scripts with a Node.js/Commander.js CLI to provide fast, scriptable task management.

## Commands

```bash
# Install dependencies
bun install

# Link globally (makes 'of' available everywhere)
bun link

# Run tests (requires OmniFocus to be running)
bun test

# Run specific test phase
bun test -- --test-name-pattern="Phase 1"

# Run single test
bun test -- --test-only

# Execute CLI directly during development
node bin/of.js <command>
```

## Architecture

```
bin/of.js           → Entry point (platform check, error handling)
src/index.js        → Commander program setup, command registration
src/jxa-runner.js   → Executes JXA via osascript, returns parsed JSON
src/output.js       → Output formatting (human/JSON/quiet modes)
src/commands/*.js   → Command handlers (register*Command pattern)
jxa/read/*.js       → JXA scripts for queries (list, get, search)
jxa/write/*.js      → JXA scripts for mutations (add, modify, complete)
jxa/utils/helpers.js → Shared JXA helpers (prepended to all scripts)
```

### Data Flow

1. CLI command → Commander parses args/options
2. Command handler calls `runJxa(category, scriptName, args)`
3. `jxa-runner.js` concatenates `helpers.js` + script, executes via `osascript -l JavaScript`
4. JXA script returns JSON to stdout
5. Command handler passes result to `print(result, options)` for formatting

### JXA Script Pattern

All JXA scripts use shared helpers from `jxa/utils/helpers.js` (auto-prepended):

```javascript
// Get args with: getArg(index, defaultValue) — index 4 = first user arg
// Parse JSON args with: parseJsonArg(index, defaultValue)
// Get app/doc: const app = getApp(); const doc = getDoc(app);
// Find entities: findProject(doc, nameOrId), findTag(), findFolder(), findTask()
// Format output: formatTask(task), formatProject(), formatFolder(), formatTag()
// Parse dates: parseDate(str) — supports "today", "tomorrow", "+3d", "+1w", ISO

// Scripts MUST return JSON via: JSON.stringify({ success: true, ... })
```

### Command Handler Pattern

```javascript
export function registerXxxCommand(program) {
  program
    .command('xxx <args>')
    .description('...')
    .option('--json', 'Output as JSON')
    .option('--pretty', 'Pretty print JSON')
    .option('-q, --quiet', 'Only output IDs')
    .option('--dry-run', 'Preview without executing')
    .action(async (args, options) => {
      await requireOmniFocus();  // Throws if OF not running
      const result = await runJxa('read|write', 'scriptName', [arg1, JSON.stringify(opts)]);
      print(result, options);
    });
}
```

## Key Conventions

- **Output modes**: All commands support `--json`, `--pretty`, `--quiet` via `print(result, options)`
- **Dry-run**: Write operations support `--dry-run` flag, scripts check `opts.dryRun`
- **Date parsing**: Natural dates ("today", "tomorrow", "+3d", "+1w") handled in JXA `parseDate()`
- **Error handling**: JXA scripts return `{ success: false, error: "message" }`
- **Entity lookup**: Scripts accept name or ID; `findProject/Tag/Folder/Task` try ID first, then name
- **ES Modules**: Project uses `"type": "module"` — use `import/export`, not `require`

## Testing

Tests require OmniFocus to be running on macOS. Test file creates real OmniFocus items prefixed with `CLI_Test_` and cleans up after.

```bash
# Full test suite
bun test

# Specific phase (1-15)
bun test -- --test-name-pattern="Phase 3"

# Single test (add .only to test)
bun test -- --test-only
```

## Adding New Commands

1. Create JXA script in `jxa/read/` or `jxa/write/`
2. Create command handler in `src/commands/`
3. Register in `src/index.js`
4. Add tests to `test/workflow.test.js`
