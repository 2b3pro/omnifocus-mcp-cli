/**
 * OmniFocus CLI - Comprehensive Workflow Tests
 *
 * Tests all CLI commands in a realistic user progression:
 * 1. Setup: Verify CLI and list existing items
 * 2. Folders: Create and manage folders (P1)
 * 3. Tags: Create and manage tags (P1)
 * 4. Projects: Create projects with all parameter combinations
 * 5. Project Lifecycle: Complete, drop, hold, activate (P1)
 * 6. Tasks: Create tasks with all parameter variations
 * 7. Views: Test list commands and perspectives
 * 8. Quick Entry: Test inbox and quick add
 * 9. Modify: Update tasks with all options including relative dates (P2)
 * 10. Search: Enhanced search with filters (P2)
 * 11. Review: Review workflow (P2)
 * 12. Completion: Complete, drop, delete operations
 * 13. Batch: Batch operations
 * 14. Error Handling: Graceful failures
 * 15. Cleanup: Remove test data
 *
 * Run with: npm test
 * Run single phase: npm test -- --test-name-pattern="Phase 1"
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const CLI = 'node bin/of.js';
const TEST_PREFIX = 'CLI_Test';
const TIMEOUT = 30000; // JXA can be slow

// Track created items for cleanup
const createdItems = {
  folders: [],
  projects: [],
  tasks: [],
  tags: []
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Execute CLI command and return parsed JSON output
 */
async function runCli(args, options = {}) {
  const cmd = `${CLI} ${args}`;
  const opts = {
    cwd: process.cwd(),
    timeout: options.timeout || TIMEOUT,
    ...options
  };

  try {
    const { stdout, stderr } = await execAsync(cmd, opts);
    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      json: tryParseJson(stdout)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || '',
      code: error.code
    };
  }
}

/**
 * Execute CLI and expect JSON output
 */
async function runCliJson(args, options = {}) {
  const result = await runCli(`${args} --json`, options);
  if (!result.success) {
    throw new Error(`CLI failed: ${result.stderr || result.error}`);
  }
  return result.json;
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique test name to avoid conflicts
 */
function uniqueName(base) {
  return `${TEST_PREFIX}_${base}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ============================================================================
// PHASE 1: SETUP & VERIFICATION
// ============================================================================

describe('Phase 1: Setup & Verification', { timeout: TIMEOUT * 4 }, () => {

  it('should verify CLI is executable', async () => {
    const result = await runCli('--version');
    assert.ok(result.success, 'CLI should execute');
    assert.match(result.stdout, /\d+\.\d+\.\d+/, 'Should output version');
  });

  it('should show help with all commands', async () => {
    const result = await runCli('--help');
    assert.ok(result.success, 'Should succeed');
    // Verify new commands are registered
    assert.ok(result.stdout.includes('folder'), 'Should have folder command');
    assert.ok(result.stdout.includes('project'), 'Should have project command');
    assert.ok(result.stdout.includes('tag'), 'Should have tag command');
    assert.ok(result.stdout.includes('review'), 'Should have review command');
  });

  it('should list existing folders', async () => {
    const result = await runCliJson('list folders');
    assert.ok(result.success, 'Should succeed');
    assert.ok(Array.isArray(result.folders), 'Should return folders array');
  });

  it('should list existing tags', async () => {
    const result = await runCliJson('list tags');
    assert.ok(result.success, 'Should succeed');
    assert.ok(Array.isArray(result.tags), 'Should return tags array');
  });

  it('should list existing projects', { timeout: TIMEOUT * 3 }, async () => {
    // Note: This can be slow with many projects
    const result = await runCliJson('list projects', { timeout: TIMEOUT * 3 });
    assert.ok(result.success, 'Should succeed');
    assert.ok(Array.isArray(result.projects), 'Should return projects array');
  });

});

// ============================================================================
// PHASE 2: FOLDER OPERATIONS (P1 - NEW)
// ============================================================================

describe('Phase 2: Folder Operations', { timeout: TIMEOUT * 3 }, () => {

  let testFolderName;
  let testFolderId;

  it('should show folder command help', async () => {
    const result = await runCli('folder --help');
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.stdout.includes('add') || result.stdout.includes('create'), 'Should show add subcommand');
    assert.ok(result.stdout.includes('modify'), 'Should show modify subcommand');
  });

  it('should create a new folder (dry-run)', async () => {
    testFolderName = uniqueName('Folder');
    const result = await runCliJson(`folder add "${testFolderName}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
    assert.ok(result.preview.name === testFolderName, 'Preview should have correct name');
  });

  it('should create a new folder', async () => {
    testFolderName = uniqueName('Folder');
    const result = await runCliJson(`folder add "${testFolderName}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.folder, 'Should return folder object');
    assert.ok(result.folder.id, 'Folder should have ID');
    testFolderId = result.folder.id;
    createdItems.folders.push(testFolderId);
  });

  it('should create a nested folder', async () => {
    const nestedName = uniqueName('Nested_Folder');
    const result = await runCliJson(`folder add "${nestedName}" --parent "${testFolderName}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.folder.id, 'Nested folder should have ID');
    createdItems.folders.push(result.folder.id);
  });

  it('should modify folder name', async () => {
    const newName = uniqueName('Renamed_Folder');
    const result = await runCliJson(`folder modify "${testFolderName}" --name "${newName}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.changes.includes('name'), 'Should report name change');
    testFolderName = newName; // Update for later tests
  });

  it('should move project to folder', { timeout: TIMEOUT * 2 }, async () => {
    // First create a project
    const projectName = uniqueName('Move_Test_Project');
    await runCliJson(`add project "${projectName}"`, { timeout: TIMEOUT * 2 });

    // Move it to our test folder
    const result = await runCliJson(`move "${projectName}" --folder "${testFolderName}"`, { timeout: TIMEOUT * 2 });
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.project, 'Should return project info');
  });

  it('should move project to root (no folder)', { timeout: TIMEOUT * 2 }, async () => {
    const projectName = uniqueName('Root_Move_Project');
    await runCliJson(`add project "${projectName}" --folder "${testFolderName}"`, { timeout: TIMEOUT * 2 });

    // Move to root by omitting folder
    const result = await runCliJson(`move "${projectName}"`, { timeout: TIMEOUT * 2 });
    assert.ok(result.success, 'Should succeed');
  });

  it('should support --dry-run for move', { timeout: TIMEOUT * 2 }, async () => {
    const projectName = uniqueName('DryRun_Move');
    await runCliJson(`add project "${projectName}"`, { timeout: TIMEOUT * 2 });

    const result = await runCliJson(`move "${projectName}" --folder "${testFolderName}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
    assert.ok(result.preview, 'Should have preview');
  });

});

// ============================================================================
// PHASE 3: TAG OPERATIONS (P1 - NEW)
// ============================================================================

describe('Phase 3: Tag Operations', { timeout: TIMEOUT * 3 }, () => {

  let testTagName;
  let testTagId;

  it('should show tag command help', async () => {
    const result = await runCli('tag --help');
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.stdout.includes('add'), 'Should show add subcommand');
    assert.ok(result.stdout.includes('tasks'), 'Should show tasks subcommand');
    assert.ok(result.stdout.includes('delete'), 'Should show delete subcommand');
  });

  it('should create a new tag (dry-run)', async () => {
    testTagName = uniqueName('Tag');
    const result = await runCliJson(`tag add "${testTagName}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
  });

  it('should create a new tag', async () => {
    testTagName = uniqueName('Tag');
    const result = await runCliJson(`tag add "${testTagName}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.tag, 'Should return tag object');
    assert.ok(result.tag.id, 'Tag should have ID');
    testTagId = result.tag.id;
    createdItems.tags.push(testTagId);
  });

  it('should create a nested tag', async () => {
    const nestedName = uniqueName('Nested_Tag');
    const result = await runCliJson(`tag add "${nestedName}" --parent "${testTagName}"`);
    assert.ok(result.success, 'Should succeed');
    createdItems.tags.push(result.tag.id);
  });

  it('should create a tag with no-next-action', async () => {
    const waitingTag = uniqueName('Waiting');
    const result = await runCliJson(`tag add "${waitingTag}" --no-next-action`);
    assert.ok(result.success, 'Should succeed');
    createdItems.tags.push(result.tag.id);
  });

  it('should modify tag name', async () => {
    const newName = uniqueName('Renamed_Tag');
    const result = await runCliJson(`tag modify "${testTagName}" --name "${newName}"`);
    assert.ok(result.success, 'Should succeed');
    testTagName = newName; // Update for later tests
  });

  it('should list tasks by tag', async () => {
    // First create a task with our tag
    const taskName = uniqueName('Tagged_Task');
    await runCliJson(`add task "${taskName}" --tag "${testTagName}"`);
    await sleep(500);

    const result = await runCliJson(`tag tasks "${testTagName}"`);
    assert.ok(Array.isArray(result), 'Should return array');
  });

  it('should delete a tag', async () => {
    const tempTag = uniqueName('Temp_Delete');
    await runCliJson(`tag add "${tempTag}"`);

    const result = await runCliJson(`tag delete "${tempTag}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.deletedTag, 'Should return deleted tag info');
  });

  it('should support --dry-run for tag delete', async () => {
    const tempTag = uniqueName('DryRun_Delete');
    await runCliJson(`tag add "${tempTag}"`);

    const result = await runCliJson(`tag delete "${tempTag}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');

    // Cleanup
    await runCli(`tag delete "${tempTag}"`);
  });

});

// ============================================================================
// PHASE 4: PROJECT CREATION
// ============================================================================

describe('Phase 4: Project Creation', { timeout: TIMEOUT * 3 }, () => {

  let testProjectName;
  let testProjectId;

  it('should create a basic project', async () => {
    testProjectName = uniqueName('Project');
    const result = await runCliJson(`add project "${testProjectName}"`);
    assert.ok(result.project || result.id, 'Should return project');
    testProjectId = result.project?.id || result.id;
    createdItems.projects.push(testProjectId);
  });

  it('should create project with note/description', async () => {
    const name = uniqueName('Project_Note');
    const note = 'Detailed project description.';
    const result = await runCliJson(`add project "${name}" --note "${note}"`);
    assert.ok(result.project || result.id, 'Should return project');
    createdItems.projects.push(result.project?.id || result.id);
  });

  it('should create project with due date', async () => {
    const name = uniqueName('Project_Due');
    const result = await runCliJson(`add project "${name}" --due "+7d"`);
    assert.ok(result.project || result.id, 'Should return project');
    createdItems.projects.push(result.project?.id || result.id);
  });

  it('should create project with defer date', async () => {
    const name = uniqueName('Project_Defer');
    const result = await runCliJson(`add project "${name}" --defer "tomorrow"`);
    assert.ok(result.project || result.id, 'Should return project');
    createdItems.projects.push(result.project?.id || result.id);
  });

  it('should create flagged project', async () => {
    const name = uniqueName('Project_Flagged');
    const result = await runCliJson(`add project "${name}" --flagged`);
    assert.ok(result.project || result.id, 'Should return project');
    createdItems.projects.push(result.project?.id || result.id);
  });

  it('should create sequential project', async () => {
    const name = uniqueName('Project_Sequential');
    const result = await runCliJson(`add project "${name}" --sequential`);
    assert.ok(result.project || result.id, 'Should return project');
    createdItems.projects.push(result.project?.id || result.id);
  });

  it('should create project with initial tasks', async () => {
    const name = uniqueName('Project_Tasks');
    const result = await runCliJson(`add project "${name}" --tasks "Task 1,Task 2,Task 3"`);
    assert.ok(result.project || result.id, 'Should return project');
    createdItems.projects.push(result.project?.id || result.id);
  });

  it('should support --dry-run for project creation', async () => {
    const name = uniqueName('Project_DryRun');
    const result = await runCliJson(`add project "${name}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
  });

});

// ============================================================================
// PHASE 5: PROJECT LIFECYCLE (P1 - NEW)
// ============================================================================

describe('Phase 5: Project Lifecycle', { timeout: TIMEOUT * 4 }, () => {

  let lifecycleProjectName;
  let lifecycleProjectId;

  before(async () => {
    lifecycleProjectName = uniqueName('Lifecycle_Project');
    const result = await runCliJson(`add project "${lifecycleProjectName}"`);
    lifecycleProjectId = result.project?.id || result.id;
    createdItems.projects.push(lifecycleProjectId);
  });

  it('should show project command help', async () => {
    const result = await runCli('project --help');
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.stdout.includes('complete'), 'Should show complete');
    assert.ok(result.stdout.includes('drop'), 'Should show drop');
    assert.ok(result.stdout.includes('hold'), 'Should show hold');
    assert.ok(result.stdout.includes('activate'), 'Should show activate');
    assert.ok(result.stdout.includes('review'), 'Should show review');
  });

  it('should put project on hold', async () => {
    const result = await runCliJson(`project hold "${lifecycleProjectName}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.changes.some(c => c.includes('hold')), 'Should indicate hold');
  });

  it('should activate project (resume from hold)', async () => {
    const result = await runCliJson(`project activate "${lifecycleProjectName}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.changes.some(c => c.includes('activate')), 'Should indicate activated');
  });

  it('should mark project as reviewed', async () => {
    const result = await runCliJson(`project review "${lifecycleProjectName}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.changes.some(c => c.includes('review')), 'Should indicate reviewed');
  });

  it('should modify project properties', async () => {
    const result = await runCliJson(`project modify "${lifecycleProjectName}" --flag`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should drop project', async () => {
    const dropProject = uniqueName('Drop_Project');
    await runCliJson(`add project "${dropProject}"`);

    const result = await runCliJson(`project drop "${dropProject}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.changes.some(c => c.includes('drop')), 'Should indicate dropped');
  });

  it('should complete project', async () => {
    const completeProject = uniqueName('Complete_Project');
    await runCliJson(`add project "${completeProject}"`);

    const result = await runCliJson(`project complete "${completeProject}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.changes.some(c => c.includes('complete')), 'Should indicate completed');
  });

  it('should support --dry-run for lifecycle commands', async () => {
    const result = await runCliJson(`project hold "${lifecycleProjectName}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
  });

});

// ============================================================================
// PHASE 6: TASK CREATION
// ============================================================================

describe('Phase 6: Task Creation', { timeout: TIMEOUT * 4 }, () => {

  let testProjectName;

  before(async () => {
    testProjectName = uniqueName('Task_Project');
    await runCliJson(`add project "${testProjectName}"`);
  });

  it('should create basic task', async () => {
    const name = uniqueName('Task');
    const result = await runCliJson(`add task "${name}"`);
    assert.ok(result.id, 'Should return task ID');
    createdItems.tasks.push(result.id);
  });

  it('should create task in project', async () => {
    const name = uniqueName('Task_Project');
    const result = await runCliJson(`add task "${name}" --project "${testProjectName}"`);
    assert.ok(result.id, 'Should return task ID');
    createdItems.tasks.push(result.id);
  });

  it('should create task with all parameters', async () => {
    const name = uniqueName('Task_Full');
    const result = await runCliJson(
      `add task "${name}" ` +
      `--project "${testProjectName}" ` +
      `--note "Full task" ` +
      `--due "+5d" ` +
      `--defer "tomorrow" ` +
      `--flagged ` +
      `--estimate "60"`
    );
    assert.ok(result.id, 'Should return task ID');
    assert.ok(result.dueDate, 'Should have due date');
    assert.ok(result.deferDate, 'Should have defer date');
    assert.strictEqual(result.flagged, true, 'Should be flagged');
    createdItems.tasks.push(result.id);
  });

  it('should support --dry-run for task creation', async () => {
    const name = uniqueName('Task_DryRun');
    const result = await runCliJson(`add task "${name}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
  });

});

// ============================================================================
// PHASE 7: VIEWS & PERSPECTIVES
// ============================================================================

describe('Phase 7: Views & Perspectives', { timeout: TIMEOUT * 2 }, () => {

  it('should list today tasks', async () => {
    const result = await runCliJson('list today');
    assert.ok(result.success, 'Should succeed');
    assert.ok(Array.isArray(result.tasks), 'Should return tasks array');
  });

  it('should list flagged tasks', async () => {
    const result = await runCliJson('list flagged');
    assert.ok(result.success, 'Should succeed');
    assert.ok(Array.isArray(result.tasks), 'Should return tasks array');
  });

  it('should list forecast', async () => {
    const result = await runCliJson('list forecast');
    assert.ok(result.success, 'Should succeed');
    assert.ok(Array.isArray(result.forecast), 'Should return forecast array');
  });

  it('should list inbox', async () => {
    const result = await runCliJson('list inbox');
    assert.ok(result.success, 'Should succeed');
    assert.ok(Array.isArray(result.tasks), 'Should return tasks array');
  });

  it('should list perspectives', async () => {
    const result = await runCliJson('perspectives');
    assert.ok(result.success, 'Should succeed');
    assert.ok(Array.isArray(result.perspectives), 'Should return perspectives array');
  });

});

// ============================================================================
// PHASE 8: QUICK ENTRY & INBOX
// ============================================================================

describe('Phase 8: Quick Entry & Inbox', { timeout: TIMEOUT * 2 }, () => {

  it('should quick add to inbox', async () => {
    const name = uniqueName('Quick');
    const result = await runCliJson(`quick "${name}"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.task.id, 'Should return task ID');
    createdItems.tasks.push(result.task.id);
  });

  it('should quick add with due date', async () => {
    const name = uniqueName('Quick_Due');
    const result = await runCliJson(`quick "${name}" --due "tomorrow"`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.task.id, 'Should return task ID');
    assert.ok(result.task.dueDate, 'Should have due date');
    createdItems.tasks.push(result.task.id);
  });

  it('should quick add flagged', async () => {
    const name = uniqueName('Quick_Flag');
    const result = await runCliJson(`quick "${name}" --flagged`);
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.task.id, 'Should return task ID');
    assert.strictEqual(result.task.flagged, true, 'Should be flagged');
    createdItems.tasks.push(result.task.id);
  });

});

// ============================================================================
// PHASE 9: MODIFY WITH RELATIVE DATES (P2 - ENHANCED)
// ============================================================================

describe('Phase 9: Modify & Relative Dates', { timeout: TIMEOUT * 3 }, () => {

  let testTaskId;

  before(async () => {
    const taskName = uniqueName('Modify_Task');
    const result = await runCliJson(`add task "${taskName}" --due "today" --defer "today"`);
    testTaskId = result.id;
    createdItems.tasks.push(testTaskId);
  });

  it('should modify task name', async () => {
    const newName = uniqueName('Modified');
    const result = await runCliJson(`modify "${testTaskId}" --name "${newName}"`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should modify task note', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --note "Updated note"`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should modify task due date', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --due "+10d"`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should adjust due date relatively with --due-by', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --due-by "+3d"`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should adjust due date backwards with --due-by', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --due-by "-2d"`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should adjust due date by weeks with --due-by', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --due-by "+1w"`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should adjust due date by months with --due-by', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --due-by "+1m"`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should adjust defer date relatively with --defer-by', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --defer-by "+5d"`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should clear due date', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --due ""`);
    assert.ok(result.success, 'Should succeed');
  });

  it('should flag and unflag task', async () => {
    await runCliJson(`modify "${testTaskId}" --flag`);
    let task = await runCliJson(`get task "${testTaskId}"`);
    assert.strictEqual(task.flagged, true, 'Should be flagged');

    await runCliJson(`modify "${testTaskId}" --unflag`);
    task = await runCliJson(`get task "${testTaskId}"`);
    assert.strictEqual(task.flagged, false, 'Should be unflagged');
  });

  it('should use flag/unflag shortcuts', async () => {
    await runCliJson(`flag "${testTaskId}"`);
    await runCliJson(`unflag "${testTaskId}"`);
    assert.ok(true, 'Shortcuts should work');
  });

  it('should support --dry-run for modifications', async () => {
    const result = await runCliJson(`modify "${testTaskId}" --name "DryRun" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
  });

});

// ============================================================================
// PHASE 10: ENHANCED SEARCH (P2 - NEW)
// ============================================================================

describe('Phase 10: Enhanced Search', { timeout: TIMEOUT * 3 }, () => {

  let searchProjectName;
  let searchTagName;

  before(async () => {
    // Create searchable content
    searchProjectName = uniqueName('Search_Project');
    searchTagName = uniqueName('Search_Tag');

    await runCliJson(`add project "${searchProjectName}"`);
    await runCliJson(`tag add "${searchTagName}"`);
    await runCliJson(`add task "Searchable flagged task" --project "${searchProjectName}" --tag "${searchTagName}" --flagged --due "tomorrow"`);
    await runCliJson(`add task "Another search task" --project "${searchProjectName}" --due "+3d"`);
    await sleep(500);
  });

  it('should search tasks by text', async () => {
    const result = await runCliJson('search "Searchable"');
    assert.ok(result.tasks || Array.isArray(result), 'Should return results');
  });

  it('should search with limit', async () => {
    const result = await runCliJson('search "task" --limit 5');
    const tasks = result.tasks || result;
    assert.ok(tasks.length <= 5, 'Should respect limit');
  });

  it('should search by project filter', async () => {
    const result = await runCliJson(`search --project "${searchProjectName}"`);
    const tasks = result.tasks || result;
    assert.ok(Array.isArray(tasks), 'Should return array');
  });

  it('should search by tag filter', async () => {
    const result = await runCliJson(`search --tag "${searchTagName}"`);
    const tasks = result.tasks || result;
    assert.ok(Array.isArray(tasks), 'Should return array');
  });

  it('should search flagged tasks', async () => {
    const result = await runCliJson('search --flagged');
    const tasks = result.tasks || result;
    assert.ok(Array.isArray(tasks), 'Should return array');
  });

  it('should search available tasks', async () => {
    const result = await runCliJson('search --available');
    const tasks = result.tasks || result;
    assert.ok(Array.isArray(tasks), 'Should return array');
  });

  it('should search with due-before filter', async () => {
    const result = await runCliJson('search --due-before "+7d"');
    const tasks = result.tasks || result;
    assert.ok(Array.isArray(tasks), 'Should return array');
  });

  it('should search with due-after filter', async () => {
    const result = await runCliJson('search --due-after "today"');
    const tasks = result.tasks || result;
    assert.ok(Array.isArray(tasks), 'Should return array');
  });

  it('should combine text and filters', async () => {
    const result = await runCliJson(`search "task" --project "${searchProjectName}" --flagged`);
    const tasks = result.tasks || result;
    assert.ok(Array.isArray(tasks), 'Should return array');
  });

  it('should search with --all to include completed', async () => {
    const result = await runCliJson('search "task" --all');
    assert.ok(result.tasks || Array.isArray(result), 'Should return results');
  });

});

// ============================================================================
// PHASE 11: REVIEW WORKFLOW (P2 - NEW)
// ============================================================================

describe('Phase 11: Review Workflow', { timeout: TIMEOUT * 2 }, () => {

  it('should show review command help', async () => {
    const result = await runCli('review --help');
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.stdout.includes('--all'), 'Should have --all option');
    assert.ok(result.stdout.includes('--limit'), 'Should have --limit option');
  });

  it('should list projects due for review', async () => {
    const result = await runCliJson('review');
    assert.ok(result.projects || Array.isArray(result), 'Should return projects');
  });

  it('should list all projects with review status', async () => {
    const result = await runCliJson('review --all');
    assert.ok(result.projects || Array.isArray(result), 'Should return projects');
  });

  it('should respect limit', async () => {
    const result = await runCliJson('review --limit 5');
    const projects = result.projects || result;
    assert.ok(projects.length <= 5 || result.totalCount !== undefined, 'Should respect limit');
  });

  it('should mark project as reviewed via project command', async () => {
    const projectName = uniqueName('Review_Me');
    await runCliJson(`add project "${projectName}"`);

    const result = await runCliJson(`project review "${projectName}"`);
    assert.ok(result.success, 'Should succeed');
  });

});

// ============================================================================
// PHASE 12: COMPLETION OPERATIONS
// ============================================================================

describe('Phase 12: Complete/Drop/Delete', { timeout: TIMEOUT * 3 }, () => {

  let testProjectName;

  before(async () => {
    testProjectName = uniqueName('Complete_Project');
    await runCliJson(`add project "${testProjectName}"`);
  });

  it('should complete a task', async () => {
    const task = await runCliJson(`add task "${uniqueName('Complete')}" --project "${testProjectName}"`);
    const result = await runCliJson(`complete "${task.id}"`);
    assert.ok(result.success || result.completed, 'Should succeed');
  });

  it('should complete multiple tasks', async () => {
    const t1 = await runCliJson(`add task "${uniqueName('Multi1')}" --project "${testProjectName}"`);
    const t2 = await runCliJson(`add task "${uniqueName('Multi2')}" --project "${testProjectName}"`);

    const result = await runCliJson(`complete "${t1.id}" "${t2.id}"`);
    assert.ok(result.success || result.completed, 'Should succeed');
  });

  it('should drop a task', async () => {
    const task = await runCliJson(`add task "${uniqueName('Drop')}" --project "${testProjectName}"`);
    const result = await runCliJson(`drop "${task.id}"`);
    assert.ok(result.success || result.dropped, 'Should succeed');
  });

  it('should delete a task', async () => {
    const task = await runCliJson(`add task "${uniqueName('Delete')}" --project "${testProjectName}"`);
    const result = await runCliJson(`delete "${task.id}"`);
    assert.ok(result.success || result.deleted, 'Should succeed');
  });

  it('should use done alias', async () => {
    const task = await runCliJson(`add task "${uniqueName('Done')}" --project "${testProjectName}"`);
    const result = await runCliJson(`done "${task.id}"`);
    assert.ok(result.success || result.completed, 'Should succeed');
  });

  it('should use rm alias', async () => {
    const task = await runCliJson(`add task "${uniqueName('Rm')}" --project "${testProjectName}"`);
    const result = await runCliJson(`rm "${task.id}"`);
    assert.ok(result.success || result.deleted, 'Should succeed');
  });

  it('should support --dry-run for complete', async () => {
    const task = await runCliJson(`add task "${uniqueName('DryComplete')}" --project "${testProjectName}"`);
    const result = await runCliJson(`complete "${task.id}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
    // Cleanup
    await runCli(`delete "${task.id}"`);
  });

});

// ============================================================================
// PHASE 13: SYNC & MISC
// ============================================================================

describe('Phase 13: Sync & Miscellaneous', { timeout: TIMEOUT * 2 }, () => {

  it('should trigger sync', async () => {
    const result = await runCliJson('sync');
    assert.ok(result.success || result.synced, 'Sync should complete');
  });

  it('should generate bash completions', async () => {
    const result = await runCli('completion bash');
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.stdout.includes('complete') || result.stdout.includes('_of'), 'Should output completion script');
  });

  it('should generate zsh completions', async () => {
    const result = await runCli('completion zsh');
    assert.ok(result.success, 'Should succeed');
    assert.ok(result.stdout.includes('compdef'), 'Should output completion script');
  });

});

// ============================================================================
// PHASE 14: ERROR HANDLING
// ============================================================================

describe('Phase 14: Error Handling', { timeout: TIMEOUT }, () => {

  it('should handle non-existent task gracefully', async () => {
    const result = await runCli('get task "nonexistent_xyz_12345" --json');
    assert.ok(!result.success || result.stdout.includes('error') || result.stdout.includes('null'), 'Should handle gracefully');
  });

  it('should handle non-existent project gracefully', async () => {
    const result = await runCli('get project "Impossible_Project_XYZ" --json');
    assert.ok(!result.success || result.stdout.includes('error') || result.stdout.includes('null'), 'Should handle gracefully');
  });

  it('should handle non-existent tag gracefully', async () => {
    const result = await runCli('tag tasks "Nonexistent_Tag_XYZ" --json');
    assert.ok(!result.success || result.stdout.includes('error'), 'Should handle gracefully');
  });

  it('should handle non-existent folder gracefully', async () => {
    const result = await runCli('folder modify "Nonexistent_Folder_XYZ" --name "X" --json');
    assert.ok(!result.success || result.stdout.includes('error'), 'Should handle gracefully');
  });

  it('should handle invalid command', async () => {
    const result = await runCli('invalidcommand');
    assert.ok(!result.success || result.stderr, 'Should fail for invalid command');
  });

});

// ============================================================================
// PHASE 15: CLEANUP
// ============================================================================

describe('Phase 15: Cleanup', { timeout: TIMEOUT * 5 }, () => {

  it('should delete test tasks', async () => {
    if (createdItems.tasks.length === 0) {
      assert.ok(true, 'No tasks to clean up');
      return;
    }

    let deleted = 0;
    for (const taskId of createdItems.tasks) {
      try {
        await runCli(`delete "${taskId}"`);
        deleted++;
      } catch {
        // Already deleted or completed
      }
    }
    console.log(`  Cleaned up ${deleted}/${createdItems.tasks.length} tasks`);
    assert.ok(true, 'Cleanup attempted');
  });

  it('should drop/complete test projects', async () => {
    if (createdItems.projects.length === 0) {
      assert.ok(true, 'No projects to clean up');
      return;
    }

    let cleaned = 0;
    for (const projectId of createdItems.projects) {
      try {
        await runCli(`project drop "${projectId}"`);
        cleaned++;
      } catch {
        // Already dropped
      }
    }
    console.log(`  Cleaned up ${cleaned}/${createdItems.projects.length} projects`);
    assert.ok(true, 'Cleanup attempted');
  });

  it('should delete test tags', async () => {
    if (createdItems.tags.length === 0) {
      assert.ok(true, 'No tags to clean up');
      return;
    }

    let deleted = 0;
    for (const tagId of createdItems.tags) {
      try {
        await runCli(`tag delete "${tagId}"`);
        deleted++;
      } catch {
        // Already deleted
      }
    }
    console.log(`  Cleaned up ${deleted}/${createdItems.tags.length} tags`);
    assert.ok(true, 'Cleanup attempted');
  });

});

// ============================================================================
// REMAINING GAPS (P3+)
// ============================================================================

/**
 * REMAINING GAPS (P3 - Lower Priority):
 *
 * 1. FOLDER DELETION
 *    - Can create/modify folders, but delete may leave orphans
 *
 * 2. PERSPECTIVE TASK LISTING
 *    - Can list perspectives, but cannot show tasks in a perspective
 *    - Perspectives are UI-bound constructs
 *
 * 3. RECURRING TASKS
 *    - No --repeat flag for creating recurring tasks
 *
 * 4. ATTACHMENT SUPPORT
 *    - No attachment add/remove/list commands
 *
 * 5. OUTPUT FORMATS
 *    - No CSV output format
 *    - No custom format templates
 *    - No TaskPaper export
 *
 * 6. INBOX ORGANIZATION
 *    - Could add dedicated `inbox assign` command
 *    - Currently use `modify --project` which works
 *
 * 7. BULK OPERATIONS
 *    - No bulk tag assignment
 *    - No bulk date adjustment across multiple tasks
 */
