//
// Copyright 2026 DXOS.org
//

import { beforeAll, describe, test } from '@effect/vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { invariant } from '@dxos/invariant';

import { dxBin } from '../../testing/index.ts';

/**
 * Protocol-level test for `dx mcp serve`: drives a real MCP session over stdio against an isolated
 * HOME (no identity — the projected surface comes from the operation registry, not from spaces).
 *
 * `runDx` cannot serve here: `spawnSync` closes stdin as soon as its input is written, and the
 * server exits with the stream rather than answering.
 */

/** The skill both halves of the prompt round trip name. */
const SKILL = 'project';

/**
 * Every skill the CLI's registry opts in as an MCP prompt. Asserted exactly: a skill that stops
 * being contributed drops off this surface silently, which is how the Space skill would have
 * disappeared unnoticed.
 */
const PROMPTS = [SKILL, 'database', 'registry'];

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
  { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'loadSkill', arguments: { skill: SKILL } } },
  { jsonrpc: '2.0', id: 5, method: 'prompts/get', params: { name: SKILL, arguments: {} } },
  { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'loadSkill', arguments: { skill: 'noSuchSkill' } } },
  {
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'invokeOperation', arguments: { key: 'org.dxos.operation.registry.queryPlugins' } },
  },
  { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'whoami', arguments: {} } },
  { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'queryOperations', arguments: {} } },
  {
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: { name: 'queryOperations', arguments: { keys: ['org.dxos.operation.space.addObject'] } },
  },
  {
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: { name: 'invokeOperation', arguments: { key: 'org.dxos.nope' } },
  },
  { jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'loadSkill', arguments: {} } },
  {
    jsonrpc: '2.0',
    id: 13,
    method: 'tools/call',
    params: { name: 'invokeOperation', arguments: { key: 'org.dxos.operation.space.queryTypes' } },
  },
];

/** All that is left of the host-local toolkits; see the TODO on `space-tools.ts`. */
const STATIC_TOOLS = ['whoami'];

/** This package's fixed surface: every operation is reached through these rather than as a tool. */
const SURFACE_TOOLS = ['queryOperations', 'invokeOperation', 'loadSkill'];

/**
 * What the host used to answer with hand-written tools, reached as `queryOperations` rows now.
 * A space listing is deliberately absent: it belongs with `whoami`, and the two port together —
 * see the TODO on `space-tools.ts`.
 */
const PROJECTED_HOST_OPERATIONS = ['queryPlugins', 'queryTypes'];

const PROJECTED_OBJECT_OPERATIONS = [
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
    responses = await runSession([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 90_000);
  }, 120_000);

  /** `responses` is populated in `beforeAll` from a fixed, known set of request ids. */
  const getResult = (id: number) => {
    const response = responses.get(id);
    invariant(response, `no response for request ${id}`);
    return response.result;
  };

  test('serves a fixed tool surface, whatever the registry holds', ({ expect }) => {
    const initialize = responses.get(1)!.result;
    expect(initialize.serverInfo.name).to.equal('DXOS Spaces');
    // The shared server instructions, applied by the projection's response passes over stdio.
    expect(initialize.instructions).to.include('queryOperations');

    const tools: { name: string; inputSchema: any }[] = responses.get(2)!.result.tools;
    const names = tools.map((tool) => tool.name);
    expect(names.slice().sort()).to.deep.equal([...STATIC_TOOLS, ...SURFACE_TOOLS].sort());
    // The point of the reshape: an operation is a row, never a tool, so the client's context does
    // not grow with the registry.
    expect(names).to.not.include('taskCreate');

    // Every advertised schema declares an object — the response pass on the transport EDGE does
    // not use.
    for (const tool of tools) {
      expect(tool.inputSchema.type, `${tool.name} input schema`).to.equal('object');
    }

    const prompts: { name: string }[] = responses.get(3)!.result.prompts;
    expect(prompts.map((prompt) => prompt.name).sort()).to.deep.equal([...PROMPTS].sort());
  });

  test('queryOperations reaches the registry, and keys returns the schema to write against', ({ expect }) => {
    const { operations } = JSON.parse(getResult(9).content[0].text);
    const keys: string[] = operations.map((operation: { key: string }) => operation.key);
    // The registry the CLI assembles carries the project/task verbs and plugin-space's object CRUD.
    // Full keys, not suffixes: several packages now have a bare `create` verb.
    expect(keys).to.include('org.dxos.operation.tasks.create');
    expect(keys).to.include('org.dxos.operation.projects.create');
    for (const verb of [...PROJECTED_OBJECT_OPERATIONS, ...PROJECTED_HOST_OPERATIONS]) {
      expect(
        keys.some((key) => key.endsWith(`.${verb}`)),
        `${verb} is in the catalog`,
      ).to.be.true;
    }

    // A view is compact: what it costs the model is a description, not a schema.
    const row = operations.find((operation: { key: string }) => operation.key === 'org.dxos.operation.tasks.create');
    expect(row).to.not.have.property('schema');
    expect(row.skills).to.include(SKILL);

    const detail = JSON.parse(getResult(10).content[0].text).operations[0];
    expect(detail.key).to.equal('org.dxos.operation.space.addObject');
    expect(detail.schema.input.type).to.equal('object');
    expect(detail.hints.mutation).to.be.a('string');
  });

  // A model recovers from a tool result; a wrong key has to name the tool that lists the right ones.
  test('invokeOperation reports an unknown key as a tool failure naming queryOperations', ({ expect }) => {
    const failure = getResult(11);
    expect(failure.isError).to.be.true;
    expect(failure.content[0].text).to.include('queryOperations');
  });

  // SEP-2640's contract: a skill reaches the model either way, so a client without prompt support
  // loses nothing. Asserted on this host because only a live session exercises both paths at once.
  test('serves the same skill through loadSkill and prompts/get', ({ expect }) => {
    const loaded = JSON.parse(responses.get(4)!.result.content[0].text);
    expect(loaded.skills[0].name).to.equal(SKILL);
    expect(loaded.skills[0].key).to.equal('org.dxos.skill.project');
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

  // Nothing infers a space: the session's first one has no relationship to the task, so a verb that
  // acts on a space and was told none is refused rather than run somewhere arbitrary.
  test('a space-addressed operation invoked without a space is refused, not defaulted', ({ expect }) => {
    const failure = getResult(13);
    expect(failure.isError).to.be.true;
    expect(failure.content[0].text).to.include('spaceId');
  });

  // What an agent reaches for first — which plugins, which spaces, which types — is dispatched like
  // any other verb now; `whoami` is the one fact this host still answers with a tool of its own.
  test('dispatches a host verb that needs no space, on a profile with no spaces', ({ expect }) => {
    const names: string[] = responses.get(2)!.result.tools.map((tool: { name: string }) => tool.name);
    for (const tool of STATIC_TOOLS) {
      expect(names, `${tool} is advertised`).to.include(tool);
    }

    // This profile has no identity and so no spaces: an operation declaring no database must still
    // answer, which is what makes the space resolution conditional rather than unconditional.
    const result = getResult(7);
    expect(result.isError, JSON.stringify(result.content)).to.not.be.true;
    const { plugins } = JSON.parse(result.content[0].text);
    expect(plugins.map((plugin: { id: string }) => plugin.id)).to.include('org.dxos.plugin.registry');
  });

  // A client renders these as the tool's safety badge, and an unset `destructiveHint` defaults to
  // true — so a read tool that annotates nothing shows up as destructive. Per-operation safety
  // moved to the `mutation` field of a queryOperations row, asserted above.
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
    expect(byName.get('queryOperations')?.readOnlyHint).to.be.true;
    // The one tool that dispatches everything cannot be safer than what it runs.
    expect(byName.get('invokeOperation')?.destructiveHint).to.be.true;
  });

  // Discovery has to be reachable without having called queryOperations first, or a model that
  // wants the workflow before the verbs has nowhere to start.
  test('loadSkill with no argument lists the skills', ({ expect }) => {
    const listing = JSON.parse(getResult(12).content[0].text);
    expect(listing.skills.map((entry: { name: string }) => entry.name)).to.include(SKILL);
    expect(listing.instructions).to.be.undefined;
  });

  // This profile has no identity, which is the interesting case: the tool has to say so as a tool
  // failure the model can act on rather than crashing the session.
  test('reports a missing identity as a tool failure', ({ expect }) => {
    const failure = responses.get(8)!.result;
    expect(failure.isError).to.be.true;
    expect(failure.content[0].text).to.include('dx account login');
  });
});
