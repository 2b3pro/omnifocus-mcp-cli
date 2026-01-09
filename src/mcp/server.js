/**
 * OmniFocus MCP Server
 * Consolidated 5-tool design for minimal token overhead
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runJxa, isOmniFocusRunning } from '../jxa-runner.js';

/**
 * Create and configure the MCP server with consolidated OmniFocus tools
 */
export function createMcpServer() {
  const server = new McpServer({
    name: 'omnifocus',
    version: '1.0.0'
  });

  // ============================================================================
  // TASK TOOL - All task operations
  // ============================================================================

  server.tool(
    'omnifocus_task',
    `Task operations. Actions: list, get, create, update, complete, drop, delete.

list: view=inbox|today|flagged|forecast|search, query?, project?, tag?, flagged?, due_before?, due_after?, limit?
get: id (required)
create: name (required), project?, due?, defer?, tags[]?, flagged?, note?, estimate_mins?
update: id (required), name?, due?, defer?, tags[]?, flagged?, project?, note?, estimate_mins?
complete/drop/delete: ids[] (required)`,
    {
      action: z.enum(['list', 'get', 'create', 'update', 'complete', 'drop', 'delete']),
      view: z.enum(['inbox', 'today', 'flagged', 'forecast', 'search']).optional(),
      query: z.string().optional(),
      project: z.string().optional(),
      tag: z.string().optional(),
      flagged: z.boolean().optional(),
      due_before: z.string().optional(),
      due_after: z.string().optional(),
      limit: z.number().optional(),
      include_completed: z.boolean().optional(),
      id: z.string().optional(),
      ids: z.array(z.string()).optional(),
      name: z.string().optional(),
      due: z.string().optional(),
      defer: z.string().optional(),
      tags: z.array(z.string()).optional(),
      note: z.string().optional(),
      estimate_mins: z.number().optional(),
    },
    async (args) => {
      const { action } = args;

      switch (action) {
        case 'list': {
          const view = args.view || 'inbox';
          let result;

          if (view === 'inbox') {
            result = await runJxa('read', 'listInbox', [JSON.stringify({
              limit: args.limit || 50,
              all: args.include_completed || false,
              full: true
            })]);
          } else if (view === 'today') {
            result = await runJxa('read', 'listToday', [JSON.stringify({
              limit: args.limit || 50,
              flagged: args.flagged || false,
              full: true
            })]);
          } else if (view === 'flagged') {
            result = await runJxa('read', 'listFlagged', [JSON.stringify({
              limit: args.limit || 50,
              all: args.include_completed || false,
              full: true
            })]);
          } else if (view === 'forecast') {
            result = await runJxa('read', 'getForecast', [JSON.stringify({
              days: args.limit || 7
            })]);
          } else if (view === 'search') {
            result = await runJxa('read', 'search', [
              args.query || '',
              JSON.stringify({
                project: args.project,
                tag: args.tag,
                flagged: args.flagged,
                dueBefore: args.due_before,
                dueAfter: args.due_after,
                all: args.include_completed || false,
                limit: args.limit || 50
              })
            ]);
          } else {
            return err(`Unknown view: ${view}`);
          }
          return ok(result);
        }

        case 'get': {
          if (!args.id) return err('id required');
          const result = await runJxa('read', 'getTask', [args.id]);
          return ok(result);
        }

        case 'create': {
          if (!args.name) return err('name required');
          const result = await runJxa('write', 'addTask', [
            args.name,
            JSON.stringify({
              note: args.note,
              project: args.project,
              tags: args.tags || [],
              due: args.due,
              defer: args.defer,
              flagged: args.flagged,
              estimate: args.estimate_mins
            })
          ]);
          return ok(result);
        }

        case 'update': {
          if (!args.id) return err('id required');
          const result = await runJxa('write', 'modifyTask', [
            args.id,
            JSON.stringify({
              name: args.name,
              note: args.note,
              due: args.due,
              defer: args.defer,
              flagged: args.flagged,
              project: args.project,
              tags: args.tags,
              estimate: args.estimate_mins
            })
          ]);
          return ok(result);
        }

        case 'complete': {
          const taskIds = args.ids || (args.id ? [args.id] : null);
          if (!taskIds?.length) return err('ids required');
          const result = await runJxa('write', 'completeTask', [...taskIds, JSON.stringify({})]);
          return ok(result);
        }

        case 'drop': {
          const taskIds = args.ids || (args.id ? [args.id] : null);
          if (!taskIds?.length) return err('ids required');
          const result = await runJxa('write', 'dropTask', [...taskIds, JSON.stringify({})]);
          return ok(result);
        }

        case 'delete': {
          const taskIds = args.ids || (args.id ? [args.id] : null);
          if (!taskIds?.length) return err('ids required');
          const result = await runJxa('write', 'deleteTask', [...taskIds, JSON.stringify({})]);
          return ok(result);
        }

        default:
          return err(`Unknown action: ${action}. Use: list|get|create|update|complete|drop|delete`);
      }
    }
  );

  // ============================================================================
  // PROJECT TOOL - All project operations
  // ============================================================================

  server.tool(
    'omnifocus_project',
    `Project operations. Actions: list, get, get_tasks, create, update, complete, drop, set_status.

list: folder?, include_completed?, include_on_hold?, limit?
get: id (required)
get_tasks: id (required), include_completed?, limit?
create: name (required), folder?, sequential?, tasks[]?, due?, defer?, note?
update: id (required), name?, due?, defer?, note?, sequential?
complete/drop: id (required)
set_status: id (required), status=active|on_hold`,
    {
      action: z.enum(['list', 'get', 'get_tasks', 'create', 'update', 'complete', 'drop', 'set_status']),
      id: z.string().optional(),
      folder: z.string().optional(),
      include_completed: z.boolean().optional(),
      include_on_hold: z.boolean().optional(),
      limit: z.number().optional(),
      name: z.string().optional(),
      sequential: z.boolean().optional(),
      tasks: z.array(z.string()).optional(),
      due: z.string().optional(),
      defer: z.string().optional(),
      note: z.string().optional(),
      status: z.enum(['active', 'on_hold']).optional(),
    },
    async (args) => {
      const { action } = args;

      switch (action) {
        case 'list': {
          const result = await runJxa('read', 'listProjects', [JSON.stringify({
            folder: args.folder,
            all: args.include_completed || false,
            onHold: args.include_on_hold || false,
            limit: args.limit || 100
          })]);
          return ok(result);
        }

        case 'get': {
          if (!args.id) return err('id required');
          const result = await runJxa('read', 'getProject', [args.id]);
          return ok(result);
        }

        case 'get_tasks': {
          if (!args.id) return err('id required');
          const result = await runJxa('read', 'listProjectTasks', [
            args.id,
            JSON.stringify({
              all: args.include_completed || false,
              limit: args.limit || 100
            })
          ]);
          return ok(result);
        }

        case 'create': {
          if (!args.name) return err('name required');
          const result = await runJxa('write', 'addProject', [
            args.name,
            JSON.stringify({
              folder: args.folder,
              sequential: args.sequential,
              tasks: args.tasks,
              due: args.due,
              defer: args.defer,
              note: args.note
            })
          ]);
          return ok(result);
        }

        case 'update': {
          if (!args.id) return err('id required');
          const result = await runJxa('write', 'modifyProject', [
            args.id,
            JSON.stringify({
              action: 'modify',
              name: args.name,
              due: args.due,
              defer: args.defer,
              note: args.note,
              sequential: args.sequential
            })
          ]);
          return ok(result);
        }

        case 'complete': {
          if (!args.id) return err('id required');
          const result = await runJxa('write', 'modifyProject', [
            args.id,
            JSON.stringify({ action: 'complete' })
          ]);
          return ok(result);
        }

        case 'drop': {
          if (!args.id) return err('id required');
          const result = await runJxa('write', 'modifyProject', [
            args.id,
            JSON.stringify({ action: 'drop' })
          ]);
          return ok(result);
        }

        case 'set_status': {
          if (!args.id) return err('id required');
          if (!args.status) return err('status required (active|on_hold)');
          const actionMap = { active: 'activate', on_hold: 'hold' };
          const result = await runJxa('write', 'modifyProject', [
            args.id,
            JSON.stringify({ action: actionMap[args.status] || args.status })
          ]);
          return ok(result);
        }

        default:
          return err(`Unknown action: ${action}. Use: list|get|get_tasks|create|update|complete|drop|set_status`);
      }
    }
  );

  // ============================================================================
  // FOLDER TOOL - All folder operations
  // ============================================================================

  server.tool(
    'omnifocus_folder',
    `Folder operations. Actions: list, create, update, move_project.

list: parent?, include_hidden?, limit?
create: name (required), parent?
update: id (required), name?, hidden?
move_project: project_id (required), folder_id (required)`,
    {
      action: z.enum(['list', 'create', 'update', 'move_project']),
      id: z.string().optional(),
      parent: z.string().optional(),
      include_hidden: z.boolean().optional(),
      limit: z.number().optional(),
      name: z.string().optional(),
      hidden: z.boolean().optional(),
      project_id: z.string().optional(),
      folder_id: z.string().optional(),
    },
    async (args) => {
      const { action } = args;

      switch (action) {
        case 'list': {
          const result = await runJxa('read', 'listFolders', [JSON.stringify({
            folder: args.parent,
            hidden: args.include_hidden || false,
            limit: args.limit || 100
          })]);
          return ok(result);
        }

        case 'create': {
          if (!args.name) return err('name required');
          const result = await runJxa('write', 'addFolder', [
            args.name,
            JSON.stringify({ parent: args.parent })
          ]);
          return ok(result);
        }

        case 'update': {
          if (!args.id) return err('id required');
          const result = await runJxa('write', 'modifyFolder', [
            args.id,
            JSON.stringify({
              name: args.name,
              hidden: args.hidden
            })
          ]);
          return ok(result);
        }

        case 'move_project': {
          if (!args.project_id) return err('project_id required');
          if (!args.folder_id) return err('folder_id required');
          const result = await runJxa('write', 'moveProject', [
            args.project_id,
            JSON.stringify({ folder: args.folder_id })
          ]);
          return ok(result);
        }

        default:
          return err(`Unknown action: ${action}. Use: list|create|update|move_project`);
      }
    }
  );

  // ============================================================================
  // TAG TOOL - All tag operations
  // ============================================================================

  server.tool(
    'omnifocus_tag',
    `Tag operations. Actions: list, get_tasks, create, update, delete.

list: include_hidden?, limit?
get_tasks: id (required), include_completed?, limit?
create: name (required), parent?
update: id (required), name?, hidden?
delete: id (required)`,
    {
      action: z.enum(['list', 'get_tasks', 'create', 'update', 'delete']),
      id: z.string().optional(),
      include_hidden: z.boolean().optional(),
      include_completed: z.boolean().optional(),
      limit: z.number().optional(),
      name: z.string().optional(),
      parent: z.string().optional(),
      hidden: z.boolean().optional(),
    },
    async (args) => {
      const { action } = args;

      switch (action) {
        case 'list': {
          const result = await runJxa('read', 'listTags', [JSON.stringify({
            hidden: args.include_hidden || false,
            limit: args.limit || 100
          })]);
          return ok(result);
        }

        case 'get_tasks': {
          if (!args.id) return err('id required');
          const result = await runJxa('read', 'listTasksByTag', [
            args.id,
            JSON.stringify({
              all: args.include_completed || false,
              limit: args.limit || 100
            })
          ]);
          return ok(result);
        }

        case 'create': {
          if (!args.name) return err('name required');
          const result = await runJxa('write', 'addTag', [
            args.name,
            JSON.stringify({ parent: args.parent })
          ]);
          return ok(result);
        }

        case 'update': {
          if (!args.id) return err('id required');
          const result = await runJxa('write', 'modifyTag', [
            args.id,
            JSON.stringify({
              name: args.name,
              hidden: args.hidden
            })
          ]);
          return ok(result);
        }

        case 'delete': {
          if (!args.id) return err('id required');
          const result = await runJxa('write', 'modifyTag', [
            args.id,
            JSON.stringify({ action: 'delete' })
          ]);
          return ok(result);
        }

        default:
          return err(`Unknown action: ${action}. Use: list|get_tasks|create|update|delete`);
      }
    }
  );

  // ============================================================================
  // UTILITY TOOL - Sync, review, status
  // ============================================================================

  server.tool(
    'omnifocus_util',
    `Utility operations. Actions: sync, review_list, mark_reviewed, status.

sync: Trigger OmniFocus sync
review_list: Get projects needing review
mark_reviewed: project_id (required)
status: Check if OmniFocus is running`,
    {
      action: z.enum(['sync', 'review_list', 'mark_reviewed', 'status']),
      project_id: z.string().optional(),
    },
    async (args) => {
      const { action } = args;

      switch (action) {
        case 'sync': {
          const result = await runJxa('write', 'sync', []);
          return ok(result);
        }

        case 'review_list': {
          const result = await runJxa('read', 'listReview', [JSON.stringify({})]);
          return ok(result);
        }

        case 'mark_reviewed': {
          if (!args.project_id) return err('project_id required');
          const result = await runJxa('write', 'modifyProject', [
            args.project_id,
            JSON.stringify({ action: 'review' })
          ]);
          return ok(result);
        }

        case 'status': {
          const running = await isOmniFocusRunning();
          return ok({
            success: true,
            running,
            message: running ? 'OmniFocus is running' : 'OmniFocus is not running'
          });
        }

        default:
          return err(`Unknown action: ${action}. Use: sync|review_list|mark_reviewed|status`);
      }
    }
  );

  return server;
}

// Helper: format success response
function ok(result) {
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

// Helper: format error response
function err(message) {
  return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: message }) }], isError: true };
}

/**
 * Run the MCP server with stdio transport
 */
export async function runMcpServer() {
  const running = await isOmniFocusRunning();
  if (!running) {
    console.error('ERROR: OmniFocus is not running. Please launch OmniFocus first.');
    process.exit(1);
  }

  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('OmniFocus MCP server running (5 tools)');
}
