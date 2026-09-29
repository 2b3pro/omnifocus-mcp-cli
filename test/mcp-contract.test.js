/**
 * MCP option contract
 *
 * The MCP server builds by hand the arguments each JXA script reads. A script
 * ignores an option it does not know, so a misnamed key does nothing and the
 * call still reports success. This checks every call the server can make
 * against the script it names, with the script runner replaced: nothing here
 * touches OmniFocus.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/mcp/server.js';

// Every action of every tool, with every option the tool's schema offers it.
const CALLS = {
  omnifocus_task: [
    { action: 'list', view: 'inbox', limit: 5, include_completed: true },
    { action: 'list', view: 'today', limit: 5, flagged: true },
    { action: 'list', view: 'flagged', limit: 5, include_completed: true },
    { action: 'list', view: 'forecast', limit: 5 },
    { action: 'list', view: 'search', query: 'q', project: 'p', tag: 't', flagged: true,
      due_before: 'tomorrow', due_after: 'today', include_completed: true, limit: 5 },
    { action: 'get', id: 'a' },
    { action: 'create', name: 'n', project: 'p', due: 'today', defer: 'today', tags: ['t'],
      flagged: true, note: 'x', estimate_mins: 5 },
    { action: 'update', id: 'a', name: 'n', project: 'p', due: 'today', defer: 'today', tags: ['t'],
      flagged: true, note: 'x', estimate_mins: 5 },
    { action: 'complete', ids: ['a', 'b', 'c'] },
    { action: 'drop', ids: ['a', 'b', 'c'] },
    { action: 'delete', ids: ['a', 'b', 'c'] },
    { action: 'complete', id: 'a' }
  ],
  omnifocus_project: [
    { action: 'list', folder: 'f', include_completed: true, include_on_hold: true, limit: 5 },
    { action: 'get', id: 'a' },
    { action: 'get_tasks', id: 'a', include_completed: true, limit: 5 },
    { action: 'create', name: 'n', folder: 'f', sequential: true, tasks: ['t'], due: 'today',
      defer: 'today', note: 'x' },
    { action: 'update', id: 'a', name: 'n', due: 'today', defer: 'today', note: 'x', sequential: true },
    { action: 'complete', id: 'a' },
    { action: 'drop', id: 'a' },
    { action: 'set_status', id: 'a', status: 'active' },
    { action: 'set_status', id: 'a', status: 'on_hold' }
  ],
  omnifocus_folder: [
    { action: 'list', parent: 'f', include_hidden: true, limit: 5 },
    { action: 'create', name: 'n', parent: 'f' },
    { action: 'update', id: 'a', name: 'n', hidden: true },
    { action: 'move_project', project_id: 'a', folder_id: 'f' }
  ],
  omnifocus_tag: [
    { action: 'list', include_hidden: true, limit: 5 },
    { action: 'get_tasks', id: 'a', include_completed: true, limit: 5 },
    { action: 'create', name: 'n', parent: 't' },
    { action: 'update', id: 'a', name: 'n', hidden: true },
    { action: 'delete', id: 'a' }
  ],
  omnifocus_util: [
    { action: 'sync' },
    { action: 'review_list' },
    { action: 'mark_reviewed', project_id: 'a' }
  ]
};

// What a script reads: the option names, and which argument holds them.
function readScript(category, name) {
  const source = readFileSync(new URL(`../jxa/${category}/${name}.js`, import.meta.url), 'utf8');
  const options = new Set([...source.matchAll(/\bopts\.([A-Za-z_]\w*)/g)].map(m => m[1]));
  const bracketed = [...source.matchAll(/\bopts\[([^\]]+)\]/g)].map(m => m[1]);
  const optionsAt = source.match(/\bopts\s*=\s*parseJsonArg\((\d+)/);
  const plainAt = [...source.matchAll(/\bgetArg\((\d+)/g)].map(m => Number(m[1]));
  return {
    options,
    bracketed,
    optionsIndex: optionsAt ? Number(optionsAt[1]) - 4 : null,
    plainIndexes: plainAt.map(i => i - 4)
  };
}

async function record() {
  const calls = [];
  const runJxa = async (category, script, args = []) => {
    calls.push({ category, script, args });
    return { success: true };
  };
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createMcpServer({ runJxa }).connect(serverTransport);
  const client = new Client({ name: 'of-contract-test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { calls, client };
}

test('the contract covers every action of every tool', async () => {
  const { client } = await record();
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(t => t.name).sort(), Object.keys(CALLS).sort(), 'tools');
    for (const tool of tools) {
      const offered = tool.inputSchema.properties.action.enum.filter(a => a !== 'status');
      const covered = [...new Set(CALLS[tool.name].map(c => c.action))];
      assert.deepEqual(covered.sort(), [...offered].sort(), `${tool.name} actions`);

      const used = new Set(CALLS[tool.name].flatMap(c => Object.keys(c)));
      const unused = Object.keys(tool.inputSchema.properties).filter(p => !used.has(p));
      assert.deepEqual(unused, [], `${tool.name} options never exercised`);
    }
  } finally {
    await client.close();
  }
});

test('each value of a choice option sends something different', async () => {
  const { calls, client } = await record();
  try {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      for (const [option, schema] of Object.entries(tool.inputSchema.properties)) {
        if (option === 'action' || !schema.enum) continue;
        const base = CALLS[tool.name].find(c => option in c);
        calls.length = 0;
        for (const value of schema.enum) {
          // Only the choice varies: options that belong to one value would
          // make two calls differ for the wrong reason.
          const request = { action: base.action, id: 'a', [option]: value };
          await client.callTool({ name: tool.name, arguments: request });
        }
        const sent = calls.map(c => JSON.stringify(c));
        assert.equal(sent.length, schema.enum.length, `${tool.name} ${option}: one script call per value`);
        assert.equal(new Set(sent).size, sent.length,
          `${tool.name} ${option}: two values send the same thing: ${sent.join(' | ')}`);
      }
    }
  } finally {
    await client.close();
  }
});

for (const [tool, requests] of Object.entries(CALLS)) {
  for (const request of requests) {
    const label = [tool, request.action, request.view || request.status || (request.ids ? 'ids' : '')]
      .filter(Boolean).join(' ');

    test(`${label}: sends only what the script reads`, async () => {
      const { calls, client } = await record();
      try {
        const response = await client.callTool({ name: tool, arguments: request });
        assert.ok(!response.isError, `tool call failed: ${response.content[0].text}`);
      } finally {
        await client.close();
      }

      assert.equal(calls.length, 1, 'one script per call');
      const { category, script, args } = calls[0];
      const reads = readScript(category, script);

      // Positional arguments: the options object where the script parses it,
      // plain strings where it reads them, and nothing beyond that.
      args.forEach((arg, index) => {
        assert.equal(typeof arg, 'string', `${script}: argument ${index} is a string`);
        if (index === reads.optionsIndex) return;
        assert.ok(reads.plainIndexes.includes(index),
          `${script} does not read argument ${index} (${JSON.stringify(arg)})`);
      });

      if (reads.optionsIndex === null || args.length <= reads.optionsIndex) return;
      const sent = JSON.parse(args[reads.optionsIndex]);
      assert.equal(typeof sent, 'object', `${script}: options argument is an object`);
      // A script that reads opts[...] by computed name cannot be checked by key.
      assert.deepEqual(reads.bracketed.filter(b => !/^field \+ "By"$/.test(b)), [],
        `${script} reads options by computed name`);
      const unread = Object.keys(sent).filter(key => !reads.options.has(key));
      assert.deepEqual(unread, [], `${script} never reads: ${unread.join(', ')}`);

    });

    // Leaving an option out must change what the script is sent. If it does
    // not, the server is dropping that option.
    for (const option of Object.keys(request).filter(name => name !== 'action' && name !== 'view')) {
      const without = { ...request };
      delete without[option];

      test(`${label}: passes ${option} on`, async () => {
        const { calls, client } = await record();
        try {
          await client.callTool({ name: tool, arguments: request });
          await client.callTool({ name: tool, arguments: without });
        } finally {
          await client.close();
        }
        assert.ok(calls.length >= 1, 'the full request reaches a script');
        assert.notDeepEqual(calls[1] || null, calls[0], `${option} makes no difference to ${calls[0].script}`);
      });
    }
  }
}
