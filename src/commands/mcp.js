/**
 * MCP Server Command
 * Runs the OmniFocus MCP server for integration with AI assistants
 */

import { runMcpServer } from '../mcp/server.js';

export function registerMcpCommand(program) {
  const mcp = program
    .command('mcp')
    .description('MCP server for AI assistant integration');

  mcp
    .command('run')
    .description('Start the OmniFocus MCP server (stdio transport)')
    .action(async () => {
      await runMcpServer();
    });

  mcp
    .command('info')
    .description('Show MCP server configuration info')
    .action(() => {
      console.log(`OmniFocus MCP Server (5 consolidated tools)

Usage in Claude Code config (~/.claude/settings.json):
{
  "mcpServers": {
    "omnifocus": {
      "command": "of",
      "args": ["mcp", "run"]
    }
  }
}

Or with full path:
{
  "mcpServers": {
    "omnifocus": {
      "command": "node",
      "args": ["/path/to/omnifocus-cli/bin/of.js", "mcp", "run"]
    }
  }
}

Tools (use 'action' param to select operation):

  omnifocus_task
    actions: list, get, create, update, complete, drop, delete
    list views: inbox, today, flagged, forecast, search

  omnifocus_project
    actions: list, get, get_tasks, create, update, complete, drop, set_status

  omnifocus_folder
    actions: list, create, update, move_project

  omnifocus_tag
    actions: list, get_tasks, create, update, delete

  omnifocus_util
    actions: sync, review_list, mark_reviewed, status
`);
    });
}
