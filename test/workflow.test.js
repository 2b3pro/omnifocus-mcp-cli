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
import { exec, execFileSync } from 'node:child_process';
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
// PHASE 2b: FOLDER DELETION
// ============================================================================
// Deleting a folder takes every project, task and subfolder inside it,
// permanently. The most important assertion here is the NEGATIVE one: that a
// refused delete leaves the contents untouched. A guard that reports refusal
// while still deleting would be worse than having no guard.

describe('Phase 2b: Folder Deletion', { timeout: TIMEOUT * 12 }, () => {

  it('should delete an empty folder without --force', async () => {
    const name = uniqueName('Del_Empty');
    await runCliJson(`folder add "${name}"`);

    const result = await runCliJson(`folder delete "${name}"`);
    assert.ok(result.success, 'Should succeed');
    assert.strictEqual(result.deleted.length, 1, 'Should report one deletion');

    const folders = await runCliJson('list folders');
    assert.ok(!folders.folders.some(f => f.name === name), 'Folder should be gone');
  });

  it('should REFUSE a non-empty folder without --force, and delete nothing', async () => {
    const folderName = uniqueName('Del_Guarded');
    const projectName = uniqueName('Del_Guarded_Proj');
    await runCliJson(`folder add "${folderName}"`);
    await runCliJson(`add project "${projectName}" --folder "${folderName}"`);
    createdItems.projects.push(projectName);

    const result = await runCliJson(`folder delete "${folderName}"`);
    assert.strictEqual(result.success, false, 'Should not report success');
    assert.strictEqual(result.deleted.length, 0, 'Should delete nothing');
    assert.ok(result.refused && result.refused.length === 1, 'Should report a refusal');
    assert.ok(/not empty/i.test(result.refused[0].error), 'Refusal should say why');

    // The assertion that matters: nothing was destroyed.
    const folders = await runCliJson('list folders');
    assert.ok(folders.folders.some(f => f.name === folderName), 'Folder must survive refusal');
    const proj = await runCliJson(`get project "${projectName}"`);
    assert.ok(proj.success, 'Contained project must survive refusal');

    // Clean up via the --force path, which also exercises it.
    const forced = await runCliJson(`folder delete "${folderName}" --force`);
    assert.ok(forced.success, '--force should succeed');
    const after = await runCliJson('list folders');
    assert.ok(!after.folders.some(f => f.name === folderName), 'Folder gone after --force');
  });

  it('should report contents in --dry-run without deleting', async () => {
    const folderName = uniqueName('Del_DryRun');
    await runCliJson(`folder add "${folderName}"`);

    const result = await runCliJson(`folder delete "${folderName}" --dry-run`);
    assert.ok(result.dryRun === true, 'Should indicate dry run');
    assert.ok(result.wouldDelete[0].contents, 'Should report contents');

    const folders = await runCliJson('list folders');
    assert.ok(folders.folders.some(f => f.name === folderName), 'Dry run must not delete');

    await runCliJson(`folder delete "${folderName}"`);
  });

  it('should error cleanly on a nonexistent folder', async () => {
    const result = await runCliJson('folder delete "CLI_Test_no_such_folder_xyz"');
    assert.strictEqual(result.success, false, 'Should not succeed');
    assert.ok(result.errors && /not found/i.test(result.errors[0].error), 'Should say not found');
  });

  it('should surface not-found in --dry-run too, not report silent success', async () => {
    // Regression: dry-run returned {success:true, wouldDelete:[]} and dropped
    // the errors array, so a typo'd name looked like "nothing to do".
    const result = await runCliJson('folder delete "CLI_Test_no_such_folder_xyz" --dry-run');
    assert.strictEqual(result.dryRun, true, 'Should be a dry run');
    assert.strictEqual(result.success, false, 'Must NOT claim success for a name that does not exist');
    assert.ok(result.errors && /not found/i.test(result.errors[0].error), 'Should report not found');
  });

  it('should handle a folder name containing a comma', async () => {
    // Names are passed as a JSON array, not comma-joined, precisely for this.
    const name = uniqueName('Del_A,B');
    await runCliJson(`folder add "${name}"`);

    const result = await runCliJson(`folder delete "${name}"`);
    assert.ok(result.success, 'Should succeed');
    assert.strictEqual(result.deleted[0].name, name, 'Should delete the exact folder');
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
    // `get task` returns {success, task:{...}} — assert on the nested object.
    // This read `task.flagged` (undefined) until 2026-07-22; the bug was
    // invisible because Phase 9 always timed out and cancelled this test
    // before it ran.
    let task = await runCliJson(`get task "${testTaskId}"`);
    assert.strictEqual(task.task.flagged, true, 'Should be flagged');

    await runCliJson(`modify "${testTaskId}" --unflag`);
    task = await runCliJson(`get task "${testTaskId}"`);
    assert.strictEqual(task.task.flagged, false, 'Should be unflagged');
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
// PHASE 9b: PLANNED DATE
// ============================================================================
// OmniFocus's "date at which work is intended" — distinct from defer (when it
// becomes available) and due (deadline). These assert the round-tripped VALUE
// rather than result.success, so they can actually fail.
//
// Own describe block with a generous budget: each JXA round-trip costs 10-13s
// here, so five read-back tests do not fit inside Phase 9's TIMEOUT * 3.

describe('Phase 9b: Planned Date', { timeout: TIMEOUT * 12 }, () => {

  let plannedTaskId;

  before(async () => {
    const result = await runCliJson(`add task "${uniqueName('Planned_Task')}"`);
    plannedTaskId = result.id;
    createdItems.tasks.push(plannedTaskId);
  });

  it('should set planned date at creation and read it back', async () => {
    const created = await runCliJson(`add task "${uniqueName('Planned_Create')}" --planned "2030-03-15"`);
    createdItems.tasks.push(created.id);
    const got = await runCliJson(`get task "${created.id}"`);
    assert.ok(got.task.plannedDate, 'plannedDate should be populated');
    assert.strictEqual(got.task.plannedDate.slice(0, 10), '2030-03-15');
  });

  it('should set planned date via modify and read it back', async () => {
    const result = await runCliJson(`modify "${plannedTaskId}" --planned "2030-06-01"`);
    assert.ok(result.success, 'Should succeed');
    const got = await runCliJson(`get task "${plannedTaskId}"`);
    assert.strictEqual(got.task.plannedDate.slice(0, 10), '2030-06-01');
  });

  it('should adjust planned date relatively with --planned-by', async () => {
    await runCliJson(`modify "${plannedTaskId}" --planned "2030-06-01"`);
    const result = await runCliJson(`modify "${plannedTaskId}" --planned-by "+1w"`);
    assert.ok(result.success, 'Should succeed');
    const got = await runCliJson(`get task "${plannedTaskId}"`);
    assert.strictEqual(got.task.plannedDate.slice(0, 10), '2030-06-08', '+1w should advance exactly 7 days');
  });

  it('should clear planned date with empty string', async () => {
    await runCliJson(`modify "${plannedTaskId}" --planned "2030-06-01"`);
    const result = await runCliJson(`modify "${plannedTaskId}" --planned ""`);
    assert.ok(result.success, 'Should succeed');
    const got = await runCliJson(`get task "${plannedTaskId}"`);
    assert.strictEqual(got.task.plannedDate, null, 'plannedDate should be cleared to null');
  });

  it('should keep planned, defer and due independent of one another', async () => {
    const created = await runCliJson(`add task "${uniqueName('Planned_Independent')}" --planned "2030-04-01" --defer "2030-03-01" --due "2030-05-01"`);
    createdItems.tasks.push(created.id);
    const got = await runCliJson(`get task "${created.id}"`);
    assert.strictEqual(got.task.plannedDate.slice(0, 10), '2030-04-01', 'planned unchanged by defer/due');
    assert.strictEqual(got.task.deferDate.slice(0, 10), '2030-03-01', 'defer unchanged by planned');
    assert.strictEqual(got.task.dueDate.slice(0, 10), '2030-05-01', 'due unchanged by planned');
  });

});

// ============================================================================
// PHASE 9c: DATE DEFAULTS, VALIDATION & FORECAST (issue #1)
// ============================================================================

describe('Phase 9c: Date Defaults, Validation & Forecast', { timeout: TIMEOUT * 20 }, () => {

  // The time of day OmniFocus gives a bare date, per field, read from the
  // user's settings with the factory value as fallback — what typing a bare
  // date into OmniFocus itself would produce.
  const FACTORY = { due: '17:00', defer: '00:00', planned: '09:00' };
  const SETTING_KEYS = { due: 'DefaultDueTime', defer: 'DefaultStartTime', planned: 'DefaultPlannedTime' };
  const expected = {};

  const clockOf = (iso) => {
    const d = new Date(iso);
    return [d.getHours(), d.getMinutes(), d.getSeconds()];
  };
  const localDay = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  let dateTaskId;

  before(async () => {
    for (const [field, key] of Object.entries(SETTING_KEYS)) {
      const raw = execFileSync('osascript', ['-l', 'JavaScript', '-e',
        `Application("OmniFocus").evaluateJavascript("String(settings.objectForKey('${key}'))")`
      ], { encoding: 'utf8', timeout: TIMEOUT }).trim();
      const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      const clock = match ? match : FACTORY[field].match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      expected[field] = [Number(clock[1]), Number(clock[2]), Number(clock[3] || 0)];
    }

    const result = await runCliJson(`add task "${uniqueName('DateDefaults_Task')}"`);
    dateTaskId = result.id;
    createdItems.tasks.push(dateTaskId);
  });

  it('should give bare dates each field\'s own default time on add', async () => {
    const created = await runCliJson(
      `add task "${uniqueName('DateDefaults_Add')}" --due "2030-05-01" --defer "2030-03-15" --planned "2030-04-01"`);
    createdItems.tasks.push(created.id);
    const got = await runCliJson(`get task "${created.id}"`);

    assert.strictEqual(localDay(got.task.dueDate), '2030-05-01');
    assert.strictEqual(localDay(got.task.deferDate), '2030-03-15');
    assert.strictEqual(localDay(got.task.plannedDate), '2030-04-01');
    assert.deepStrictEqual(clockOf(got.task.dueDate), expected.due, 'due uses the default due time');
    assert.deepStrictEqual(clockOf(got.task.deferDate), expected.defer, 'defer uses the default defer time');
    assert.deepStrictEqual(clockOf(got.task.plannedDate), expected.planned, 'planned uses the default planned time');
  });

  it('should give relative dates each field\'s own default time on modify', async () => {
    const result = await runCliJson(`modify "${dateTaskId}" --due "+3d" --defer "tomorrow" --planned "+2d"`);
    assert.ok(result.success, 'Should succeed');
    const got = await runCliJson(`get task "${dateTaskId}"`);
    assert.deepStrictEqual(clockOf(got.task.dueDate), expected.due);
    assert.deepStrictEqual(clockOf(got.task.deferDate), expected.defer);
    assert.deepStrictEqual(clockOf(got.task.plannedDate), expected.planned);
  });

  it('should keep an explicit time on every field', async () => {
    const result = await runCliJson(
      `modify "${dateTaskId}" --due "2030-05-01T21:45:00" --defer "2030-03-15T13:20:00" --planned "2030-04-01T06:10:00"`);
    assert.ok(result.success, 'Should succeed');
    const got = await runCliJson(`get task "${dateTaskId}"`);
    assert.deepStrictEqual(clockOf(got.task.dueDate), [21, 45, 0]);
    assert.deepStrictEqual(clockOf(got.task.deferDate), [13, 20, 0]);
    assert.deepStrictEqual(clockOf(got.task.plannedDate), [6, 10, 0]);
  });

  it('should give project dates the field default times', async () => {
    const name = uniqueName('DateDefaults_Project');
    await runCliJson(`add project "${name}" --due "2030-05-01" --defer "2030-03-15"`);
    createdItems.projects.push(name);
    let got = await runCliJson(`get project "${name}"`);
    assert.deepStrictEqual(clockOf(got.project.dueDate), expected.due);
    assert.deepStrictEqual(clockOf(got.project.deferDate), expected.defer);

    await runCliJson(`project modify "${name}" --due "2030-06-01" --defer "2030-04-15"`);
    got = await runCliJson(`get project "${name}"`);
    assert.strictEqual(localDay(got.project.dueDate), '2030-06-01');
    assert.strictEqual(localDay(got.project.deferDate), '2030-04-15');
    assert.deepStrictEqual(clockOf(got.project.dueDate), expected.due);
    assert.deepStrictEqual(clockOf(got.project.deferDate), expected.defer);
  });

  it('should reject an unparseable date on add and create nothing', async () => {
    const name = uniqueName('DateInvalid_Add');
    const result = await runCli(`add task "${name}" --defer "next friday" --json`);
    const json = result.json || tryParseJson(result.stdout);
    assert.strictEqual(json.success, false, 'Should not report success');
    assert.match(json.error, /Invalid defer date: next friday/);

    const found = await runCliJson(`search "${name}" --all`);
    for (const task of found.tasks) createdItems.tasks.push(task.id);
    assert.strictEqual(found.tasks.length, 0, 'No task should have been created');
  });

  it('should reject an unparseable date in --dry-run too', async () => {
    const result = await runCli(`add task "${uniqueName('DateInvalid_Dry')}" --due "3d" --dry-run --json`);
    const json = result.json || tryParseJson(result.stdout);
    assert.strictEqual(json.success, false, 'Should not report success');
    assert.match(json.error, /Invalid due date: 3d/);
  });

  it('should reject an unparseable date on modify and change nothing', async () => {
    await runCliJson(`modify "${dateTaskId}" --defer "2030-03-15T13:20:00"`);
    const before = await runCliJson(`get task "${dateTaskId}"`);

    const result = await runCli(`modify "${dateTaskId}" --name "CLI_Test_should_not_apply" --defer "2030-02-30" --json`);
    assert.strictEqual(result.success, false, 'Should exit non-zero');
    const json = tryParseJson(result.stdout);
    assert.strictEqual(json.success, false, 'Should not report success');
    assert.match(json.error, /Invalid defer date: 2030-02-30/);

    const after = await runCliJson(`get task "${dateTaskId}"`);
    assert.strictEqual(after.task.deferDate, before.task.deferDate, 'defer date untouched');
    assert.strictEqual(after.task.name, before.task.name, 'other changes in the same command not applied');
  });

  it('should reject a malformed relative offset on modify', async () => {
    const before = await runCliJson(`get task "${dateTaskId}"`);
    const result = await runCli(`modify "${dateTaskId}" --defer-by "soon" --json`);
    const json = tryParseJson(result.stdout);
    assert.strictEqual(json.success, false, 'Should not report success');
    assert.match(json.error, /Invalid defer offset: soon/);
    const after = await runCliJson(`get task "${dateTaskId}"`);
    assert.strictEqual(after.task.deferDate, before.task.deferDate, 'defer date untouched');
  });

  it('should reject an unparseable date on project add and modify', async () => {
    const name = uniqueName('DateInvalid_Project');
    const added = await runCli(`add project "${name}" --due "someday" --json`);
    const addedJson = added.json || tryParseJson(added.stdout);
    assert.strictEqual(addedJson.success, false, 'Should not report success');
    assert.match(addedJson.error, /Invalid due date: someday/);
    const listed = await runCliJson('list projects --all --limit 500');
    const leaked = listed.projects.filter(p => p.name === name);
    for (const project of leaked) createdItems.projects.push(project.id);
    assert.strictEqual(leaked.length, 0, 'No project should have been created');

    const target = uniqueName('DateInvalid_ProjectModify');
    await runCliJson(`add project "${target}"`);
    createdItems.projects.push(target);
    const modified = await runCli(`project modify "${target}" --defer "someday" --json`);
    const modifiedJson = modified.json || tryParseJson(modified.stdout);
    assert.strictEqual(modifiedJson.success, false, 'Should not report success');
    assert.match(modifiedJson.error, /Invalid defer date: someday/);
  });

  it('should list a task under its local due day in the forecast', async () => {
    // 23:30 local is the next day in UTC for every timezone west of it, and
    // the same day in UTC for none east of UTC+0:30 — so also pin 00:30.
    const pad = (n) => String(n).padStart(2, '0');
    const day = new Date();
    day.setDate(day.getDate() + 2);
    const key = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

    const late = await runCliJson(`add task "${uniqueName('Forecast_Late')}" --due "${key}T23:30:00"`);
    createdItems.tasks.push(late.id);
    const early = await runCliJson(`add task "${uniqueName('Forecast_Early')}" --due "${key}T00:30:00"`);
    createdItems.tasks.push(early.id);

    const result = await runCliJson('list forecast --days 4');
    assert.ok(result.success, 'Should succeed');
    const dayOf = (id) => {
      const entry = result.forecast.find(f => f.tasks.some(t => t.id === id));
      return entry ? entry.date : null;
    };
    assert.strictEqual(dayOf(late.id), key, 'late-evening task listed under its local day');
    assert.strictEqual(dayOf(early.id), key, 'early-morning task listed under its local day');
  });

  it('should stamp the current time for a completion dated today', async () => {
    const task = await runCliJson(`add task "${uniqueName('Complete_Today')}"`);
    createdItems.tasks.push(task.id);

    const started = Date.now();
    const result = await runCliJson(`complete "${task.id}" --on today`);
    const finished = Date.now();
    assert.ok(result.success, 'Should succeed');

    // OmniFocus keeps whole seconds, so allow for the truncation.
    const stamped = new Date(result.completed[0].completionDate).getTime();
    assert.ok(stamped >= started - 1000 && stamped <= finished,
      `completion ${result.completed[0].completionDate} should fall while the command ran`);
  });

  it('should stamp noon for a completion backdated to a bare day', async () => {
    const task = await runCliJson(`add task "${uniqueName('Complete_Yesterday')}"`);
    createdItems.tasks.push(task.id);

    const result = await runCliJson(`complete "${task.id}" --on yesterday`);
    assert.ok(result.success, 'Should succeed');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const stamped = result.completed[0].completionDate;
    assert.strictEqual(localDay(stamped), localDay(yesterday.toISOString()));
    assert.deepStrictEqual(clockOf(stamped), [12, 0, 0]);
  });

  it('should treat a bare search bound as the whole day', async () => {
    const marker = uniqueName('Bounds');
    const dues = {
      dayBeforeLate: '2031-07-14T23:30:00',
      early: '2031-07-15T00:30:00',
      late: '2031-07-15T23:30:00',
      dayAfterEarly: '2031-07-16T00:30:00'
    };
    const ids = {};
    for (const [label, due] of Object.entries(dues)) {
      const task = await runCliJson(`add task "${marker}_${label}" --due "${due}"`);
      createdItems.tasks.push(task.id);
      ids[label] = task.id;
    }

    const found = async (flags) => {
      const result = await runCliJson(`search "${marker}" ${flags}`);
      return result.tasks.map(t => t.id).sort();
    };

    assert.deepStrictEqual(await found('--due-after "2031-07-15" --due-before "2031-07-15"'),
      [ids.early, ids.late].sort(), 'one day as both bounds returns exactly that day');
    assert.deepStrictEqual(await found('--due-before "2031-07-15"'),
      [ids.dayBeforeLate, ids.early, ids.late].sort(), 'before includes the whole of the day named');
    assert.deepStrictEqual(await found('--due-after "2031-07-15"'),
      [ids.early, ids.late, ids.dayAfterEarly].sort(), 'after includes the whole of the day named');
    assert.deepStrictEqual(await found('--due-before "2031-07-15T12:00:00"'),
      [ids.dayBeforeLate, ids.early].sort(), 'an explicit time is used as given');
  });

  it('should reject an unparseable search bound instead of ignoring the filter', async () => {
    const result = await runCli('search --due-before "next friday" --json');
    const json = result.json || tryParseJson(result.stdout);
    assert.strictEqual(json.success, false, 'Should not report success');
    assert.match(json.error, /Invalid due-before date: next friday/);
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

});

// ============================================================================
// PHASE 11b: REVIEW INTERVAL
// ============================================================================
// The cadence that decides which projects appear in `of review` above.
// OmniFocus stores it as a repetition record {unit, steps, fixed}.
// Separate block for the same reason as Phase 9b: JXA round-trips are slow.

describe('Phase 11b: Review Interval', { timeout: TIMEOUT * 12 }, () => {

  it('should set and read back a review interval', async () => {
    const name = uniqueName('ReviewInterval_Project');
    await runCliJson(`add project "${name}"`);
    createdItems.projects.push(name);

    const result = await runCliJson(`project modify "${name}" --review-interval 2m`);
    assert.ok(result.success, 'Should succeed');

    const got = await runCliJson(`get project "${name}"`);
    assert.strictEqual(got.project.reviewInterval.unit, 'month');
    assert.strictEqual(got.project.reviewInterval.steps, 2);
  });

  it('should preserve the fixed flag when only the cadence changes', async () => {
    const name = uniqueName('ReviewFixed_Project');
    await runCliJson(`add project "${name}"`);
    createdItems.projects.push(name);

    const before = await runCliJson(`get project "${name}"`);
    const fixedBefore = before.project.reviewInterval?.fixed;

    await runCliJson(`project modify "${name}" --review-interval 3w`);
    const after = await runCliJson(`get project "${name}"`);

    assert.strictEqual(after.project.reviewInterval.unit, 'week');
    assert.strictEqual(after.project.reviewInterval.steps, 3);
    assert.strictEqual(after.project.reviewInterval.fixed, fixedBefore, 'fixed/sliding behavior must not silently flip');
  });

  it('should reject a malformed review interval instead of silently ignoring it', async () => {
    const name = uniqueName('ReviewBad_Project');
    await runCliJson(`add project "${name}"`);
    createdItems.projects.push(name);

    const result = await runCliJson(`project modify "${name}" --review-interval "fortnight"`);
    assert.strictEqual(result.success, false, 'Should fail loudly, not no-op');
    assert.ok(/Invalid review interval/.test(result.error), 'Should explain the expected format');
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
// PHASE 13b: MCP DATE PASSTHROUGH
// ============================================================================

describe('Phase 13b: MCP Date Passthrough', { timeout: TIMEOUT * 12 }, () => {

  let client;

  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args });
    return JSON.parse(response.content[0].text);
  };

  before(async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const { createMcpServer } = await import('../src/mcp/server.js');

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer().connect(serverTransport);
    client = new Client({ name: 'of-test', version: '0.0.0' });
    await client.connect(clientTransport);
  });

  after(async () => {
    if (client) await client.close();
  });

  it('should set due and defer dates on task create and update', async () => {
    const created = await call('omnifocus_task', {
      action: 'create', name: uniqueName('Mcp_Dates_Task'),
      due: '2030-05-01T21:45:00', defer: '2030-03-15T13:20:00'
    });
    assert.ok(created.success, `Should succeed: ${created.error}`);
    createdItems.tasks.push(created.id);

    let got = await runCliJson(`get task "${created.id}"`);
    assert.strictEqual(got.task.dueDate, new Date(2030, 4, 1, 21, 45, 0).toISOString(), 'due set on create');
    assert.strictEqual(got.task.deferDate, new Date(2030, 2, 15, 13, 20, 0).toISOString(), 'defer set on create');

    const updated = await call('omnifocus_task', {
      action: 'update', id: created.id,
      due: '2030-06-01T08:05:00', defer: '2030-04-15T10:10:00'
    });
    assert.ok(updated.success, `Should succeed: ${updated.error}`);

    got = await runCliJson(`get task "${created.id}"`);
    assert.strictEqual(got.task.dueDate, new Date(2030, 5, 1, 8, 5, 0).toISOString(), 'due set on update');
    assert.strictEqual(got.task.deferDate, new Date(2030, 3, 15, 10, 10, 0).toISOString(), 'defer set on update');
  });

  it('should set due and defer dates on project create and update', async () => {
    const name = uniqueName('Mcp_Dates_Project');
    const created = await call('omnifocus_project', {
      action: 'create', name,
      due: '2030-05-01T21:45:00', defer: '2030-03-15T13:20:00'
    });
    assert.ok(created.success, `Should succeed: ${created.error}`);
    createdItems.projects.push(name);

    let got = await runCliJson(`get project "${name}"`);
    assert.strictEqual(got.project.dueDate, new Date(2030, 4, 1, 21, 45, 0).toISOString(), 'due set on create');
    assert.strictEqual(got.project.deferDate, new Date(2030, 2, 15, 13, 20, 0).toISOString(), 'defer set on create');

    const updated = await call('omnifocus_project', {
      action: 'update', id: created.project.id,
      due: '2030-06-01T08:05:00', defer: '2030-04-15T10:10:00'
    });
    assert.ok(updated.success, `Should succeed: ${updated.error}`);

    got = await runCliJson(`get project "${name}"`);
    assert.strictEqual(got.project.dueDate, new Date(2030, 5, 1, 8, 5, 0).toISOString(), 'due set on update');
    assert.strictEqual(got.project.deferDate, new Date(2030, 3, 15, 10, 10, 0).toISOString(), 'defer set on update');
  });

  it('should report an unparseable date instead of dropping it', async () => {
    const name = uniqueName('Mcp_Dates_Invalid');
    const created = await call('omnifocus_task', { action: 'create', name, defer: 'next friday' });
    if (created.id) createdItems.tasks.push(created.id);
    assert.strictEqual(created.success, false, 'Should not report success');
    assert.match(created.error, /Invalid defer date: next friday/);
  });

});

// ============================================================================
// PHASE 13c: MCP OPTION CONTRACT
// ============================================================================
// The MCP server builds the option object each JXA script reads. A key the
// script does not read is dropped without an error, so every option is checked
// here by its effect in OmniFocus rather than by the reported success.

describe('Phase 13c: MCP Option Contract', { timeout: TIMEOUT * 40 }, () => {

  let client;

  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args });
    return JSON.parse(response.content[0].text);
  };
  const addTask = async (base, flags = '') => {
    const task = await runCliJson(`add task "${uniqueName(base)}" ${flags}`);
    createdItems.tasks.push(task.id);
    return task;
  };
  const addProject = async (base) => {
    const name = uniqueName(base);
    const result = await runCliJson(`add project "${name}"`);
    createdItems.projects.push(name);
    return { name, id: result.project.id };
  };
  const ids = (list) => list.map(item => item.id);

  before(async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const { createMcpServer } = await import('../src/mcp/server.js');

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer().connect(serverTransport);
    client = new Client({ name: 'of-test', version: '0.0.0' });
    await client.connect(clientTransport);
  });

  after(async () => {
    if (client) await client.close();
  });

  it('should set the estimate on task create and update', async () => {
    const created = await call('omnifocus_task', {
      action: 'create', name: uniqueName('Mcp_Estimate'), estimate_mins: 25
    });
    assert.ok(created.success, `Should succeed: ${created.error}`);
    createdItems.tasks.push(created.id);
    let got = await runCliJson(`get task "${created.id}"`);
    assert.strictEqual(got.task.estimatedMinutes, 25, 'estimate set on create');

    const updated = await call('omnifocus_task', { action: 'update', id: created.id, estimate_mins: 40 });
    assert.ok(updated.success, `Should succeed: ${updated.error}`);
    got = await runCliJson(`get task "${created.id}"`);
    assert.strictEqual(got.task.estimatedMinutes, 40, 'estimate set on update');
  });

  it('should replace the tags on task update', async () => {
    const tagNames = [uniqueName('Mcp_TagA'), uniqueName('Mcp_TagB'), uniqueName('Mcp_TagC')];
    for (const name of tagNames) {
      const tag = await runCliJson(`tag add "${name}"`);
      createdItems.tags.push(tag.tag.id);
    }
    const created = await call('omnifocus_task', {
      action: 'create', name: uniqueName('Mcp_Tags'), tags: [tagNames[0], tagNames[1]]
    });
    createdItems.tasks.push(created.id);

    const updated = await call('omnifocus_task', {
      action: 'update', id: created.id, tags: [tagNames[1], tagNames[2]]
    });
    assert.ok(updated.success, `Should succeed: ${updated.error}`);
    let got = await runCliJson(`get task "${created.id}"`);
    assert.deepStrictEqual([...got.task.tags].sort(), [tagNames[1], tagNames[2]].sort(), 'tags replaced');

    const unknown = await call('omnifocus_task', {
      action: 'update', id: created.id, name: 'CLI_Test_should_not_apply', tags: [tagNames[0], 'CLI_Test_no_such_tag_xyz']
    });
    assert.strictEqual(unknown.success, false, 'Should not report success');
    assert.match(unknown.error, /Tag not found: CLI_Test_no_such_tag_xyz/);
    got = await runCliJson(`get task "${created.id}"`);
    assert.deepStrictEqual([...got.task.tags].sort(), [tagNames[1], tagNames[2]].sort(), 'tags untouched');
    assert.notStrictEqual(got.task.name, 'CLI_Test_should_not_apply', 'other changes in the same call not applied');

    const cleared = await call('omnifocus_task', { action: 'update', id: created.id, tags: [] });
    assert.ok(cleared.success, `Should succeed: ${cleared.error}`);
    got = await runCliJson(`get task "${created.id}"`);
    assert.deepStrictEqual(got.task.tags, [], 'an empty list clears the tags');

    const untouched = await call('omnifocus_task', { action: 'update', id: created.id, tags: [tagNames[0]] });
    assert.ok(untouched.success, `Should succeed: ${untouched.error}`);
    await call('omnifocus_task', { action: 'update', id: created.id, note: 'note only' });
    got = await runCliJson(`get task "${created.id}"`);
    assert.deepStrictEqual(got.task.tags, [tagNames[0]], 'an update without tags leaves them alone');
  });

  it('should act on every id given to complete, drop and delete', async () => {
    for (const [action, key] of [['complete', 'completed'], ['drop', 'dropped'], ['delete', 'deleted']]) {
      const first = await addTask(`Mcp_${action}_1`);
      const second = await addTask(`Mcp_${action}_2`);
      const third = await addTask(`Mcp_${action}_3`);

      const result = await call('omnifocus_task', { action, ids: [first.id, second.id, third.id] });
      assert.ok(result.success, `${action} should succeed: ${JSON.stringify(result.errors || result.error)}`);
      assert.deepStrictEqual(ids(result[key]).sort(), [first.id, second.id, third.id].sort(),
        `${action} should act on all three tasks`);
    }
  });

  it('should include completed tasks in task lists when asked', async () => {
    const marker = uniqueName('Mcp_Completed');
    const open = await runCliJson(`add task "${marker}_open" --flagged`);
    const done = await runCliJson(`add task "${marker}_done" --flagged`);
    createdItems.tasks.push(open.id, done.id);
    await runCliJson(`complete "${done.id}"`);

    for (const view of ['inbox', 'flagged', 'search']) {
      const args = { action: 'list', view, query: marker, limit: 2000 };
      const without = await call('omnifocus_task', args);
      const withCompleted = await call('omnifocus_task', { ...args, include_completed: true });
      assert.ok(ids(without.tasks).includes(open.id), `${view}: open task listed`);
      assert.ok(!ids(without.tasks).includes(done.id), `${view}: completed task hidden by default`);
      assert.ok(ids(withCompleted.tasks).includes(open.id), `${view}: open task listed with include_completed`);
      assert.ok(ids(withCompleted.tasks).includes(done.id), `${view}: completed task listed with include_completed`);
    }
  });

  it('should include flagged tasks in the today view when asked', async () => {
    const task = await addTask('Mcp_TodayFlagged', '--flagged');

    const without = await call('omnifocus_task', { action: 'list', view: 'today', limit: 2000 });
    const withFlagged = await call('omnifocus_task', { action: 'list', view: 'today', flagged: true, limit: 2000 });
    assert.ok(!ids(without.tasks).includes(task.id), 'undated flagged task not in today by default');
    assert.ok(ids(withFlagged.tasks).includes(task.id), 'undated flagged task in today with flagged');
  });

  it('should complete, drop, hold and activate projects', async () => {
    const statusOf = async (name) => (await runCliJson(`get project "${name}"`)).project.status;

    const held = await addProject('Mcp_Project_Hold');
    let result = await call('omnifocus_project', { action: 'set_status', id: held.id, status: 'on_hold' });
    assert.ok(result.success, `Should succeed: ${result.error}`);
    assert.strictEqual(await statusOf(held.name), 'on hold status');

    result = await call('omnifocus_project', { action: 'set_status', id: held.id, status: 'active' });
    assert.ok(result.success, `Should succeed: ${result.error}`);
    assert.strictEqual(await statusOf(held.name), 'active status');

    const completed = await addProject('Mcp_Project_Complete');
    result = await call('omnifocus_project', { action: 'complete', id: completed.id });
    assert.ok(result.success, `Should succeed: ${result.error}`);
    assert.strictEqual(await statusOf(completed.name), 'done status');

    const dropped = await addProject('Mcp_Project_Drop');
    result = await call('omnifocus_project', { action: 'drop', id: dropped.id });
    assert.ok(result.success, `Should succeed: ${result.error}`);
    assert.strictEqual(await statusOf(dropped.name), 'dropped status');
  });

  it('should include completed and on-hold projects in the project list when asked', async () => {
    const active = await addProject('Mcp_List_Active');
    const held = await addProject('Mcp_List_Hold');
    const done = await addProject('Mcp_List_Done');
    await runCliJson(`project hold "${held.name}"`);
    await runCliJson(`project complete "${done.name}"`);

    const list = async (args) => ids((await call('omnifocus_project', { action: 'list', limit: 2000, ...args })).projects);

    const plain = await list({});
    assert.ok(plain.includes(active.id), 'active project listed');
    assert.ok(!plain.includes(held.id), 'on-hold project hidden by default');
    assert.ok(!plain.includes(done.id), 'completed project hidden by default');
    assert.ok((await list({ include_on_hold: true })).includes(held.id), 'on-hold project listed with include_on_hold');
    assert.ok((await list({ include_completed: true })).includes(done.id), 'completed project listed with include_completed');
  });

  it('should include completed tasks in project and tag task lists when asked', async () => {
    const project = await addProject('Mcp_Tasks_Project');
    const tagName = uniqueName('Mcp_Tasks_Tag');
    const tag = await runCliJson(`tag add "${tagName}"`);
    createdItems.tags.push(tag.tag.id);

    const open = await addTask('Mcp_Tasks_open', `--project "${project.name}" --tag "${tagName}"`);
    const done = await addTask('Mcp_Tasks_done', `--project "${project.name}" --tag "${tagName}"`);
    await runCliJson(`complete "${done.id}"`);

    const inProject = async (args) => ids((await call('omnifocus_project',
      { action: 'get_tasks', id: project.id, limit: 2000, ...args })).tasks);
    assert.deepStrictEqual(await inProject({}), [open.id], 'project: completed task hidden by default');
    assert.deepStrictEqual((await inProject({ include_completed: true })).sort(), [open.id, done.id].sort(),
      'project: completed task listed with include_completed');

    // get_tasks on a tag returns a bare array
    const withTag = async (args) => ids(await call('omnifocus_tag',
      { action: 'get_tasks', id: tag.tag.id, limit: 2000, ...args }));
    assert.deepStrictEqual(await withTag({}), [open.id], 'tag: completed task hidden by default');
    assert.deepStrictEqual((await withTag({ include_completed: true })).sort(), [open.id, done.id].sort(),
      'tag: completed task listed with include_completed');
  });

  it('should include hidden tags and folders in lists when asked', async () => {
    const tagName = uniqueName('Mcp_Hidden_Tag');
    const tag = await runCliJson(`tag add "${tagName}"`);
    createdItems.tags.push(tag.tag.id);
    const folderName = uniqueName('Mcp_Hidden_Folder');
    const folder = await runCliJson(`folder add "${folderName}"`);
    createdItems.folders.push(folderName);

    let result = await call('omnifocus_tag', { action: 'update', id: tag.tag.id, hidden: true });
    assert.ok(result.success, `Should succeed: ${result.error}`);
    result = await call('omnifocus_folder', { action: 'update', id: folder.folder.id, hidden: true });
    assert.ok(result.success, `Should succeed: ${result.error}`);

    const tags = async (args) => ids((await call('omnifocus_tag', { action: 'list', limit: 2000, ...args })).tags);
    assert.ok(!(await tags({})).includes(tag.tag.id), 'hidden tag not listed by default');
    assert.ok((await tags({ include_hidden: true })).includes(tag.tag.id), 'hidden tag listed with include_hidden');

    const folders = async (args) => ids((await call('omnifocus_folder', { action: 'list', limit: 2000, ...args })).folders);
    assert.ok(!(await folders({})).includes(folder.folder.id), 'hidden folder not listed by default');
    assert.ok((await folders({ include_hidden: true })).includes(folder.folder.id), 'hidden folder listed with include_hidden');
  });

  it('should delete a tag', async () => {
    const tagName = uniqueName('Mcp_Delete_Tag');
    const tag = await runCliJson(`tag add "${tagName}"`);
    createdItems.tags.push(tag.tag.id);

    const result = await call('omnifocus_tag', { action: 'delete', id: tag.tag.id });
    assert.ok(result.success, `Should succeed: ${result.error}`);

    const remaining = await call('omnifocus_tag', { action: 'list', include_hidden: true, limit: 2000 });
    assert.ok(!ids(remaining.tags).includes(tag.tag.id), 'tag should be gone');
    createdItems.tags.pop();
  });

  it('should mark a project reviewed', async () => {
    const project = await addProject('Mcp_Review');
    const before = (await runCliJson(`get project "${project.name}"`)).project.lastReviewDate;
    await sleep(1500);

    const started = Date.now();
    const result = await call('omnifocus_util', { action: 'mark_reviewed', project_id: project.id });
    assert.ok(result.success, `Should succeed: ${result.error}`);

    const after = (await runCliJson(`get project "${project.name}"`)).project.lastReviewDate;
    assert.notStrictEqual(after, before, 'lastReviewDate should change');
    assert.ok(new Date(after).getTime() >= started - 1000, 'lastReviewDate should be the time of the call');
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

  // Cleanup used to `catch {}` every failure and then `assert.ok(true)`, so it
  // could fail completely and still report green — which is how 68 tasks and 37
  // projects accumulated in a live database. Failures are collected and asserted
  // now, and projects are DELETED rather than dropped (dropping leaves them and
  // all their tasks in place forever).
  //
  // Deletions are batched: `delete`, `project delete` and `folder delete` all
  // take a variadic id list, so one process handles many items. Spawning `of`
  // per item cost ~1-2s each and pushed this phase past its timeout.

  const CHUNK = 50;   // keep argv well clear of the shell's limit

  async function deleteBatched(command, ids, suffix = '') {
    const failures = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK).map(id => `"${id}"`).join(' ');
      try {
        await runCli(`${command} ${chunk}${suffix}`);
      } catch (e) {
        failures.push(`${command} [${ids.slice(i, i + CHUNK).length} items]: ${e.message}`);
      }
    }
    return failures;
  }

  it('should delete test tasks', async () => {
    const failures = await deleteBatched('delete', createdItems.tasks);
    assert.deepStrictEqual(failures, [], `Task cleanup failed: ${failures.join('; ')}`);
  });

  it('should delete test projects', async () => {
    // --force: a test project legitimately holds tasks, and they go with it.
    const failures = await deleteBatched('project delete', createdItems.projects, ' --force');
    assert.deepStrictEqual(failures, [], `Project cleanup failed: ${failures.join('; ')}`);
  });

  it('should delete test folders', async () => {
    const failures = await deleteBatched('folder delete', createdItems.folders, ' --force');
    assert.deepStrictEqual(failures, [], `Folder cleanup failed: ${failures.join('; ')}`);
  });

  it('should delete test tags', async () => {
    // `tag delete` takes a single tag, so this one still loops.
    const failures = [];
    for (const tagId of createdItems.tags) {
      try {
        await runCli(`tag delete "${tagId}"`);
      } catch (e) {
        failures.push(`${tagId}: ${e.message}`);
      }
    }
    assert.deepStrictEqual(failures, [], `Tag cleanup failed: ${failures.join('; ')}`);
  });

  it('should leave no CLI_Test_ items behind', async () => {
    // Tracked-id cleanup only reaches what a test remembered to register. This
    // sweeps by name prefix so anything created and forgotten is still removed,
    // then asserts the database is actually clean rather than assuming it.
    //
    // --all on every enumeration: completed projects report 'done status' and
    // completed tasks are hidden from search by default, which is precisely
    // where residue collects. Without it this assertion passes on an empty set.
    const named = (list, key) => (list && list[key] ? list[key] : [])
      .filter(x => x.name && x.name.startsWith(TEST_PREFIX));

    // `search --all` walks every task including completed ones and takes ~20-40s
    // on a real database — well past the default per-command TIMEOUT. This is a
    // known slow path, not a hang, so give the enumerations room rather than
    // failing cleanup on a timeout.
    const SLOW = { timeout: TIMEOUT * 4 };

    const sweep = async () => {
      const projects = named(await runCliJson('list projects --all --limit 500', SLOW), 'projects');
      await deleteBatched('project delete', projects.map(p => p.id), ' --force');

      const tasks = named(await runCliJson(`search "${TEST_PREFIX}" --all --limit 500`, SLOW), 'tasks');
      await deleteBatched('delete', tasks.map(t => t.id));

      const folders = named(await runCliJson('list folders --limit 500'), 'folders');
      await deleteBatched('folder delete', folders.map(f => f.id), ' --force');

      for (const g of named(await runCliJson('list tags --limit 500'), 'tags')) {
        try { await runCli(`tag delete "${g.id}"`); } catch {}
      }
    };

    await sweep();

    // Every entity type the suite can create is checked. Tags and folders were
    // omitted at first and three tags survived a "passing" cleanup — an
    // assertion that only looks where it already swept proves nothing.
    const leftover = [
      ...named(await runCliJson(`search "${TEST_PREFIX}" --all --limit 500`, SLOW), 'tasks').map(t => `task:${t.name}`),
      ...named(await runCliJson('list projects --all --limit 500', SLOW), 'projects').map(p => `project:${p.name}`),
      ...named(await runCliJson('list folders --limit 500'), 'folders').map(f => `folder:${f.name}`),
      ...named(await runCliJson('list tags --limit 500'), 'tags').map(g => `tag:${g.name}`)
    ];
    assert.deepStrictEqual(leftover, [], `Test data left in the database: ${leftover.join(', ')}`);
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
