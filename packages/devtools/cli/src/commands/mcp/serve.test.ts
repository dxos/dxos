//
// Copyright 2026 DXOS.org
//

import { beforeAll, describe, test } from '@effect/vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { dxBin } from '../../testing';

/**
 * Protocol-level test for `dx mcp serve`: drives a real MCP session over stdio against an isolated
 * HOME (no identity — the projected surface comes from the operation registry, not from spaces).
 *
 * `runDx` cannot serve here: `spawnSync` closes stdin as soon as its input is written, and the
 * server exits with the stream rather than answering.
 */

/** The one skill the CLI's registry opts in as a prompt; both halves of the round trip name it. */
const SKILL = 'codeProject';

const REQUESTS = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
  },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  { jsonrpc: '2.0', id: 3, method: 'prompts/list', params: {} },
  { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'skillLoad', arguments: { skill: SKILL } } },
  { jsonrpc: '2.0', id: 5, method: 'prompts/get', params: { name: SKILL, arguments: {} } },
  { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'skillLoad', arguments: { skill: 'noSuchSkill' } } },
  { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'listTypes', arguments: {} } },
  { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'whoami', arguments: {} } },
];

/** The host-local toolkits, named as EDGE names them; see the TODOs on each `*-tools.ts`. */
const STATIC_TOOLS = ['whoami', 'listSpaces', 'listPlugins', 'listTypes', 'listOperations'];

/**
 * Object CRUD contributed by plugin-space as operations, so these names prove the projection
 * reaches the registry; named after the ECHO API (`Database.add` / `Database.remove`).
 */
const PROJECTED_OBJECT_TOOLS = [
  'addObject',
  'getObjects',
  'updateObject',
  'removeObjects',
  'queryObjects',
  'queryTypes',
  'addTag',
  'removeTag',
  'addRelation',
  'addType',
];

type Response = { id?: number; result?: any };

/** Boots the server, sends the requests, and resolves once every awaited id has answered. */
const runSession = (awaitedIds: number[], timeout: number): Promise<Map<number, Response>> =>
  new Promise((resolve, reject) => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-mcp-test-'));
    const child = spawn(dxBin, ['mcp', 'serve'], {
      env: {
        ...process.env,
        HOME: home,
        PROTO_HOME: process.env.PROTO_HOME ?? path.join(process.env.HOME ?? '', '.proto'),
        DX_DEBUG: 'error',
        NO_COLOR: '1',
        PROTO_REPORTER: 'text',
      },
    });

    const responses = new Map<number, Response>();
    let buffer = '';
    const finish = (error?: Error) => {
      clearTimeout(timer);
      child.kill('SIGKILL');
      fs.rmSync(home, { recursive: true, force: true });
      error ? reject(error) : resolve(responses);
    };
    const timer = setTimeout(
      () => finish(new Error(`timed out awaiting ${awaitedIds}; got ${[...responses.keys()]}`)),
      timeout,
    );

    child.stdout.on('data', (chunk) => {
      buffer += String(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines.filter((entry) => entry.trim().length > 0)) {
        try {
          const message: Response = JSON.parse(line);
          if (message.id !== undefined) {
            responses.set(message.id, message);
          }
        } catch {
          // Not a protocol message; the transport is line-delimited JSON and anything else is noise.
        }
      }
      if (awaitedIds.every((id) => responses.has(id))) {
        finish();
      }
    });
    child.on('error', finish);

    for (const request of REQUESTS) {
      child.stdin.write(`${JSON.stringify(request)}\n`);
    }
  });

describe('dx mcp serve', () => {
  // Booting a client, activating plugins and reading the operation registry costs far more than the
  // assertions, so one session answers every request and each test reads its own reply.
  let responses: Map<number, Response>;
  beforeAll(async () => {
    responses = await runSession([1, 2, 3, 4, 5, 6, 7, 8], 90_000);
  }, 120_000);

  test('serves the projected surface over a real MCP session', ({ expect }) => {
    const initialize = responses.get(1)!.result;
    expect(initialize.serverInfo.name).to.equal('DXOS Spaces');
    // The shared server instructions, applied by the projection's response passes over stdio.
    expect(initialize.instructions).to.include('skillLoad');

    const tools: { name: string; inputSchema: any }[] = responses.get(2)!.result.tools;
    const names = tools.map((tool) => tool.name);
    expect(names).to.include('skillLoad');
    // Annotated operations project; the registry the CLI assembles carries the project/task verbs.
    expect(names).to.include('taskCreate');
    expect(names).to.include('projectCreate');

    // Every advertised schema declares an object, and a ref parameter is narrowed to its object
    // shape rather than the untyped `anyOf` the toolkit renders — both response passes, on the
    // transport EDGE does not use.
    for (const tool of tools) {
      expect(tool.inputSchema.type, `${tool.name} input schema`).to.equal('object');
    }
    const taskSet = tools.find((tool) => tool.name === 'taskCreate')!.inputSchema.properties.taskSet;
    expect(taskSet.type).to.equal('object');
    expect(taskSet).to.not.have.property('anyOf');

    const prompts: { name: string }[] = responses.get(3)!.result.prompts;
    expect(prompts.map((prompt) => prompt.name)).to.include(SKILL);
  });

  // SEP-2640's contract: a skill reaches the model either way, so a client without prompt support
  // loses nothing. Asserted on this host because only a live session exercises both paths at once.
  test('serves the same skill through skillLoad and prompts/get', ({ expect }) => {
    const loaded = JSON.parse(responses.get(4)!.result.content[0].text);
    expect(loaded.name).to.equal(SKILL);
    expect(loaded.key).to.equal('org.dxos.plugin.projects.skill.codeProject');
    expect(loaded.instructions).to.be.a('string').and.to.have.length.greaterThan(0);

    const messages: { role: string; content: { type: string; text: string } }[] = responses.get(5)!.result.messages;
    expect(messages).to.have.length(1);
    expect(messages[0].role).to.equal('user');
    expect(messages[0].content.text).to.equal(loaded.instructions);
  });

  // A model recovers from a tool result and cannot see a protocol error, so an unknown name has to
  // come back as `isError` with the names it could have used.
  test('reports an unknown skill as a tool failure, not a protocol error', ({ expect }) => {
    const failure = responses.get(6)!.result;
    expect(failure.isError).to.be.true;
    expect(failure.content[0].text).to.include('noSuchSkill');
    expect(failure.content[0].text).to.include(SKILL);
  });

  // The host-local half of the surface. Without it a client sees only the projected verbs, and the
  // ones an agent reaches for first — whoami, listSpaces, the object CRUD — are simply absent.
  test('serves the static toolkits alongside the projected operations', ({ expect }) => {
    const names: string[] = responses.get(2)!.result.tools.map((tool: { name: string }) => tool.name);
    for (const tool of [...STATIC_TOOLS, ...PROJECTED_OBJECT_TOOLS]) {
      expect(names, `${tool} is advertised`).to.include(tool);
    }

    const types = JSON.parse(responses.get(7)!.result.content[0].text).types;
    expect(types).to.be.an('array').with.length.greaterThan(0);
    expect(types.map((type: { typename: string }) => type.typename)).to.include('org.dxos.type.task');
  });

  // A client renders these as the tool's safety badge, and an unset `destructiveHint` defaults to
  // true — so a read tool that annotates nothing shows up as destructive.
  test('advertises safety hints, with no read-only tool marked destructive', ({ expect }) => {
    const tools: { name: string; annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean } }[] =
      responses.get(2)!.result.tools;
    for (const tool of tools) {
      expect(tool.annotations?.destructiveHint, `${tool.name} destructiveHint`).to.be.a('boolean');
      if (tool.annotations?.readOnlyHint) {
        expect(tool.annotations.destructiveHint, `${tool.name} is read-only yet destructive`).to.be.false;
      }
    }

    const byName = new Map(tools.map((tool) => [tool.name, tool.annotations]));
    expect(byName.get('whoami')?.readOnlyHint).to.be.true;
    expect(byName.get('removeObjects')?.destructiveHint).to.be.true;
    expect(byName.get('addObject')?.destructiveHint).to.be.false;
  });

  // This profile has no identity, which is the interesting case: the tool has to say so as a tool
  // failure the model can act on rather than crashing the session.
  test('reports a missing identity as a tool failure', ({ expect }) => {
    const failure = responses.get(8)!.result;
    expect(failure.isError).to.be.true;
    expect(failure.content[0].text).to.include('dx account login');
  });
});
