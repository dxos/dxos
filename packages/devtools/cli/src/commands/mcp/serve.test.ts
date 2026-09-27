//
// Copyright 2026 DXOS.org
//

import { beforeAll, describe, test } from '@effect/vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { invariant } from '@dxos/invariant';

import { MCP_REQUEST_META, dxBin } from '../../testing/index.ts';

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
const PROMPTS = [SKILL, 'database', 'file', 'registry'];

/** The requests every session sends after its own opening, whichever revision it speaks. */
const SURFACE_REQUESTS = [
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
  // `key` is required, so these arguments fail input decoding before the handler runs.
  { jsonrpc: '2.0', id: 14, method: 'tools/call', params: { name: 'invokeOperation', arguments: {} } },
];

const SURFACE_IDS = SURFACE_REQUESTS.map((request) => request.id);

/** The host-local toolkits: `whoami` (see the TODO on `space-tools.ts`) and the loopback `createUpload`. */
const STATIC_TOOLS = ['whoami', 'createUpload'];

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

type Response = { id?: number; result?: any; error?: any };

/** Boots the server, sends the requests, and resolves once every awaited id has answered. */
const runSession = (
  requests: readonly unknown[],
  awaitedIds: number[],
  timeout: number,
): Promise<Map<number, Response>> =>
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
        let message: Response;
        try {
          message = JSON.parse(line);
        } catch {
          // stdout is the protocol stream: any other line corrupts a strictly parsing client's session.
          finish(new Error(`non-protocol line on stdout: ${line}`));
          return;
        }
        if (message.id !== undefined) {
          responses.set(message.id, message);
        }
      }
      if (awaitedIds.every((id) => responses.has(id))) {
        finish();
      }
    });
    child.on('error', finish);

    for (const request of requests) {
      child.stdin.write(`${JSON.stringify(request)}\n`);
    }
  });

/** `responses` holds a fixed, known set of request ids, so a missing one is a broken session. */
const responseOf = (responses: Map<number, Response>, id: number): Response => {
  const response = responses.get(id);
  invariant(response, `no response for request ${id}`);
  return response;
};

const resultOf = (responses: Map<number, Response>, id: number) => {
  const response = responseOf(responses, id);
  invariant(response.error === undefined, `request ${id} failed: ${JSON.stringify(response.error)}`);
  return response.result;
};

/** Registers the assertions every protocol revision must satisfy against its session's replies. */
const surfaceTests = (responses: () => Map<number, Response>) => {
  const getResult = (id: number) => resultOf(responses(), id);

  test('serves a fixed tool surface, whatever the registry holds', ({ expect }) => {
    const tools: { name: string; inputSchema: any }[] = getResult(2).tools;
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

    const prompts: { name: string }[] = getResult(3).prompts;
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
    const loaded = JSON.parse(getResult(4).content[0].text);
    expect(loaded.skills[0].name).to.equal(SKILL);
    expect(loaded.skills[0].key).to.equal('org.dxos.skill.project');
    expect(loaded.instructions).to.be.a('string').and.to.have.length.greaterThan(0);

    const messages: { role: string; content: { type: string; text: string } }[] = getResult(5).messages;
    expect(messages).to.have.length(1);
    expect(messages[0].role).to.equal('user');
    expect(messages[0].content.text).to.equal(loaded.instructions);
  });

  // A model recovers from a tool result and cannot see a protocol error, so an unknown name has to
  // come back as `isError` with the names it could have used.
  test('reports an unknown skill as a tool failure, not a protocol error', ({ expect }) => {
    const failure = getResult(6);
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
    const names: string[] = getResult(2).tools.map((tool: { name: string }) => tool.name);
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
      getResult(2).tools;
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
    const failure = getResult(8);
    expect(failure.isError).to.be.true;
    expect(failure.content[0].text).to.include('dx account login');
  });
};

describe('dx mcp serve', () => {
  // Booting a client, activating plugins and reading the operation registry costs far more than the
  // assertions, so one session answers every request and each test reads its own reply.
  let responses: Map<number, Response>;
  beforeAll(async () => {
    responses = await runSession(
      [
        { jsonrpc: '2.0', id: 1, method: 'server/discover', params: { _meta: MCP_REQUEST_META } },
        ...SURFACE_REQUESTS.map((request) => ({ ...request, params: { _meta: MCP_REQUEST_META, ...request.params } })),
      ],
      [1, ...SURFACE_IDS],
      90_000,
    );
  }, 120_000);

  test('server/discover advertises the revision, the surface and the instructions', ({ expect }) => {
    const discover = resultOf(responses, 1);
    expect(discover.supportedVersions).to.include('2026-07-28');
    expect(discover.capabilities.tools).to.be.an('object');
    expect(discover.capabilities.prompts).to.be.an('object');
    expect(discover._meta['io.modelcontextprotocol/serverInfo'].name).to.equal('DXOS Spaces');
    // The shared server instructions, applied by the projection's response passes over stdio.
    expect(discover.instructions).to.include('queryOperations');
  });

  test('answers a tool call with a complete result', ({ expect }) => {
    expect(resultOf(responses, 4).resultType).to.equal('complete');
  });

  surfaceTests(() => responses);

  // This revision answers invalid tool input with a result the model can read and retry against.
  test('reports schema-invalid tool arguments as a tool failure', ({ expect }) => {
    const failure = resultOf(responses, 14);
    expect(failure.isError).to.be.true;
    expect(failure.content[0].text).to.include('key');
  });
});

// TODO(wittjosiah): Remove when dx mcp serve drops 2025-era MCP support.
describe('2025-era MCP client', () => {
  let responses: Map<number, Response>;
  beforeAll(async () => {
    responses = await runSession(
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
        },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        ...SURFACE_REQUESTS,
        { jsonrpc: '2.0', id: 15, method: 'server/discover', params: { _meta: MCP_REQUEST_META } },
      ],
      [1, ...SURFACE_IDS, 15],
      90_000,
    );
  }, 120_000);

  test('initialize names the server and carries the instructions', ({ expect }) => {
    const initialize = resultOf(responses, 1);
    expect(initialize.serverInfo.name).to.equal('DXOS Spaces');
    // The layer is configured with a name and version only, so a title means the shared identity was merged.
    expect(initialize.serverInfo.title).to.be.a('string');
    expect(initialize.instructions).to.include('queryOperations');
  });

  surfaceTests(() => responses);

  // This revision maps invalid tool input to a protocol error, which a model never sees.
  test('reports schema-invalid tool arguments as a protocol error', ({ expect }) => {
    const response = responseOf(responses, 14);
    expect(response.result).to.be.undefined;
    expect(response.error.code).to.equal(-32602);
  });

  test('server/discover on the same connection advertises this revision', ({ expect }) => {
    expect(resultOf(responses, 15).supportedVersions).to.include('2025-06-18');
  });
});
