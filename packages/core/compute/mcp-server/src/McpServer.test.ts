//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Obj, Registry } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import { DXN, SpaceId } from '@dxos/keys';

import * as McpServer from './McpServer';

const SPACE = SpaceId.random();
const SPACE_A = SpaceId.random();
const SPACE_B = SpaceId.random();

const KEY = 'com.example.operation.tasks.createTask';

const CreateTask = Operation.make({
  meta: { key: DXN.make(KEY), name: 'Create Task', description: 'Creates a task.' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Struct({ id: Schema.String }),
  services: [Database.Service],
}).pipe(Operation.mutation('write'), Operation.idempotent);

/** Declares `spaceId` in its own input, so the call states its target there rather than ambiently. */
const ArchiveSpace = Operation.make({
  meta: { key: DXN.make('com.example.operation.space.archive'), name: 'Archive Space' },
  input: Schema.Struct({ spaceId: Schema.String }),
  output: Schema.Struct({ archived: Schema.Boolean }),
  services: [Database.Service],
}).pipe(Operation.mutation('destructive'));

const QueryObjects = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.space.queryObjects'),
    name: 'Query Objects',
    description: 'Queries objects in a space.',
  },
  input: Schema.Struct({ typename: Schema.optional(Schema.String) }),
  output: Schema.Struct({ objects: Schema.Array(Schema.Unknown) }),
  services: [Database.Service],
}).pipe(Operation.mutation('none'));

/** Declares no database: it asks about the host rather than about a space's data. */
const QueryPlugins = Operation.make({
  meta: { key: DXN.make('com.example.operation.registry.queryPlugins'), name: 'Query Plugins' },
  input: Schema.Struct({ enabled: Schema.optional(Schema.Boolean) }),
  output: Schema.Struct({ plugins: Schema.Array(Schema.Unknown) }),
}).pipe(Operation.mutation('none'));

/** Declares no database either, but is space-addressed: its space comes from the refs it is given. */
const RemoveObjects = Operation.make({
  meta: { key: DXN.make('com.example.operation.space.removeObjects'), name: 'Remove Objects' },
  input: Schema.Struct({ objects: Schema.Array(Schema.Unknown) }),
  output: Schema.Struct({ removed: Schema.Number }),
}).pipe(Operation.mutation('destructive'));

const makeSkill = (props: {
  key: string;
  operations?: readonly Operation.Definition.Any[];
  mcpPrompt?: boolean;
  instructions?: string;
}): Skill.Skill =>
  Skill.make({
    key: props.key,
    name: props.key,
    description: `${props.key} workflow.`,
    mcpPrompt: props.mcpPrompt ?? true,
    instructions: Template.make({ source: props.instructions ?? 'Follow the workflow.' }),
    tools: Skill.toolDefinitions({ operations: [...(props.operations ?? [])] }),
  });

/** A registry over serialized operations and built skills — what a host wires up for real. */
const testRegistry = ({
  operations = [CreateTask],
  skills = [makeSkill({ key: 'org.dxos.skill.codeProject', operations: [CreateTask] })],
}: {
  operations?: readonly Operation.Definition.Any[];
  skills?: readonly Skill.Skill[];
} = {}): Registry.Registry => makeRegistry({ initial: [...Operation.serializable(operations), ...skills] });

type Invocation = McpServer.InvokeRequest;

const testHost = (
  options: { spaceIds?: readonly string[] | undefined; output?: unknown; fail?: boolean } = {},
): {
  host: McpServer.HostShape;
  invocations: Invocation[];
} => {
  const { output = { ok: true }, fail: shouldFail } = options;
  // Read through `in`, since a destructuring default cannot tell an explicit `undefined` from an
  // omitted key.
  const spaceIds = 'spaceIds' in options ? options.spaceIds : [SPACE_A];
  const invocations: Invocation[] = [];
  return {
    invocations,
    host: {
      spaceIds,
      invoke: (request) => {
        invocations.push(request);
        return shouldFail ? Effect.fail(McpServer.hostError('host unavailable')) : Effect.succeed(output);
      },
    },
  };
};

const runInvoke = (
  args: { key?: string; input?: Record<string, unknown>; spaceId?: SpaceId },
  options: { registry?: Registry.Registry; host?: ReturnType<typeof testHost> } = {},
) => {
  const registry = options.registry ?? testRegistry();
  const host = options.host ?? testHost();
  return {
    invocations: host.invocations,
    result: EffectEx.runPromise(
      Effect.result(
        McpServer.invoke(registry, host.host, { key: args.key ?? KEY, input: args.input, spaceId: args.spaceId }),
      ),
    ),
  };
};

describe('McpServer', () => {
  describe('invokeOperation', () => {
    test('dispatches the named operation into the space the call named', async ({ expect }) => {
      const { invocations, result } = runInvoke({ input: { title: 'Write tests' }, spaceId: SPACE_A });
      expect(successOf(await result)).to.deep.equal({ ok: true });
      expect(invocations).to.deep.equal([{ key: KEY, input: { title: 'Write tests' }, spaceId: SPACE_A }]);
    });

    // The session's first space has no relationship to the caller's task, so defaulting to it
    // files work into an arbitrary space. Refused instead, naming how to choose one.
    test('an operation that acts on a space is refused when the call names none', async ({ expect }) => {
      const { invocations, result } = runInvoke({ input: { title: 'Write tests' } });
      expect(failureOf(await result).code).to.equal('invalid_request');
      expect(failureOf(await result).message).to.include('spaceId');
      expect(invocations).to.have.length(0);
    });

    test('an unknown key points at queryOperations rather than failing opaquely', async ({ expect }) => {
      const { invocations, result } = runInvoke({ key: 'org.dxos.nope' });
      expect(failureOf(await result).code).to.equal('invalid_request');
      expect(failureOf(await result).message).to.include('queryOperations');
      expect(invocations).to.have.length(0);
    });

    test('a key spelled with its dxn: prefix or version still dispatches', async ({ expect }) => {
      const { invocations, result } = runInvoke({ key: `dxn:${KEY}:0.0.0`, input: { title: 'x' }, spaceId: SPACE_A });
      successOf(await result);
      expect(invocations[0].key).to.equal(KEY);
    });

    // Skills are the unit of governance: present in the registry is not the same as reachable.
    test('an operation no opted-in skill names is as uninvocable as one that does not exist', async ({ expect }) => {
      const registry = testRegistry({ operations: [CreateTask, QueryObjects] });
      const { result, invocations } = runInvoke({ key: 'com.example.operation.space.queryObjects' }, { registry });
      expect(failureOf(await result).code).to.equal('invalid_request');
      expect(invocations).to.have.length(0);
    });

    test('a non-object output is wrapped, because structuredContent must be an object', async ({ expect }) => {
      const { result } = runInvoke({ input: { title: 'x' }, spaceId: SPACE_A }, { host: testHost({ output: 42 }) });
      expect(successOf(await result)).to.deep.equal({ output: 42 });
    });

    test('space-less references in the result are qualified with the space they resolved in', async ({ expect }) => {
      const output = { taskSet: { '/': 'echo:///01J000000000000000000000000' } };
      const { result } = runInvoke({ input: { title: 'x' }, spaceId: SPACE_A }, { host: testHost({ output }) });
      expect(successOf(await result)).to.deep.equal({
        taskSet: { '/': `echo://${SPACE_A}/01J000000000000000000000000` },
      });
    });

    test('a space outside the session context is refused before the operation runs', async ({ expect }) => {
      const { result, invocations } = runInvoke({ input: { title: 'x' }, spaceId: SPACE_B });
      expect(failureOf(await result).code).to.equal('space_not_in_context');
      expect(invocations).to.have.length(0);
    });

    // An operation declaring `spaceId` in its own input states its target there; that value is as
    // much a statement of the call's space as the ambient parameter, so it must reach both.
    test('an operation that declares spaceId in its input targets that space', async ({ expect }) => {
      const registry = testRegistry({
        operations: [ArchiveSpace],
        skills: [makeSkill({ key: 'org.dxos.skill.codeProject', operations: [ArchiveSpace] })],
      });
      const host = testHost({ spaceIds: [SPACE_A, SPACE_B] });

      const { result, invocations } = runInvoke(
        { key: 'com.example.operation.space.archive', input: { spaceId: SPACE_B } },
        { registry, host },
      );

      successOf(await result);
      expect(invocations[0].spaceId).to.equal(SPACE_B);
      expect(invocations[0].input).to.deep.equal({ spaceId: SPACE_B });
    });

    // A host that enumerated and found none has stated a restriction, not the absence of one.
    test('an empty space context refuses every call, while an absent one is unrestricted', async ({ expect }) => {
      const none = runInvoke({ input: { title: 'x' }, spaceId: SPACE_B }, { host: testHost({ spaceIds: [] }) });
      expect(failureOf(await none.result).code).to.equal('space_not_in_context');
      expect(none.invocations).to.have.length(0);

      const unrestricted = runInvoke(
        { input: { title: 'x' }, spaceId: SPACE_B },
        { host: testHost({ spaceIds: undefined }) },
      );
      successOf(await unrestricted.result);
      expect(unrestricted.invocations[0].spaceId).to.equal(SPACE_B);
    });

    // `queryPlugins` asks what this host has installed, which is answerable before any space
    // exists — and a profile with no identity yet is exactly when it is most useful.
    test('an operation declaring no database answers where the session has no space', async ({ expect }) => {
      const registry = testRegistry({
        operations: [QueryPlugins],
        skills: [makeSkill({ key: 'org.dxos.skill.registry', operations: [QueryPlugins] })],
      });
      const { result, invocations } = runInvoke(
        { key: 'com.example.operation.registry.queryPlugins' },
        { registry, host: testHost({ spaceIds: [], output: { plugins: [] } }) },
      );

      expect(successOf(await result)).to.deep.equal({ plugins: [] });
      expect(invocations[0].spaceId).to.be.undefined;
    });

    test('an operation declaring no database still takes the space its refs name', async ({ expect }) => {
      const registry = testRegistry({
        operations: [RemoveObjects],
        skills: [makeSkill({ key: 'org.dxos.skill.database', operations: [RemoveObjects] })],
      });
      const { result, invocations } = runInvoke(
        {
          key: 'com.example.operation.space.removeObjects',
          input: { objects: [{ '/': `echo://${SPACE_B}/01J000000000000000000000000` }] },
        },
        { registry, host: testHost({ spaceIds: [SPACE_A, SPACE_B] }) },
      );

      successOf(await result);
      expect(invocations[0].spaceId).to.equal(SPACE_B);
    });

    test('a space named where the session has none is refused as out of context', async ({ expect }) => {
      const { result, invocations } = runInvoke(
        { input: { title: 'x' }, spaceId: SPACE_A },
        { host: testHost({ spaceIds: [] }) },
      );
      expect(failureOf(await result).code).to.equal('space_not_in_context');
      expect(invocations).to.have.length(0);
    });

    test('a host failure carries the underlying message, not an Effect envelope', async ({ expect }) => {
      const { result } = runInvoke({ input: { title: 'x' }, spaceId: SPACE_A }, { host: testHost({ fail: true }) });
      expect(failureOf(await result).code).to.equal('operation_failed');
      expect(failureOf(await result).message).to.include('host unavailable');
    });

    // Input arrives as raw JSON rather than through a per-operation tool schema, so this handler is
    // the only thing standing between a malformed call and the operation's own internals.
    test('input is validated against the schema, naming the lookup that returns it', async ({ expect }) => {
      const { result, invocations } = runInvoke({ input: { title: 42 }, spaceId: SPACE_A });
      expect(failureOf(await result).code).to.equal('invalid_request');
      expect(failureOf(await result).message).to.include('queryOperations');
      expect(invocations).to.have.length(0);
    });
  });

  describe('queryOperations', () => {
    const run = (
      registry: Registry.Registry,
      query: { query?: string; skill?: string; keys?: readonly string[] } = {},
    ) => EffectEx.runPromise(McpServer.queryOperations(registry, query)).then(({ operations }) => operations);

    const twoSkills = () =>
      testRegistry({
        operations: [CreateTask, QueryObjects],
        skills: [
          makeSkill({ key: 'org.dxos.skill.codeProject', operations: [CreateTask] }),
          makeSkill({ key: 'org.dxos.skill.database', operations: [QueryObjects] }),
        ],
      });

    test('the fixed surface is three tools, whatever the registry holds', ({ expect }) => {
      expect([...McpServer.TOOL_NAMES]).to.deep.equal(['queryOperations', 'invokeOperation', 'loadSkill']);
    });

    test('lists the governed operations with their hints, without schemas', async ({ expect }) => {
      const [row] = await run(testRegistry());
      expect(row.key).to.equal(KEY);
      expect(row.description).to.equal('Creates a task.');
      expect(row.skills).to.deep.equal(['codeProject']);
      expect(row.requiresSpace).to.be.true;
      expect(row.hints.mutation).to.equal('write');
      expect(row.hints.idempotent).to.be.true;
      expect(row).to.not.have.property('schema');
    });

    test('an operation no opted-in skill names is not listed', async ({ expect }) => {
      const registry = testRegistry({ operations: [CreateTask, QueryObjects] });
      const rows = await run(registry);
      expect(rows.map((row) => row.key)).to.deep.equal([KEY]);
    });

    test('a text query narrows through the registry, matching keys as well as prose', async ({ expect }) => {
      const registry = twoSkills();
      expect((await run(registry, { query: 'CREATES task' })).map((row) => row.key)).to.deep.equal([KEY]);
      expect((await run(registry, { query: 'queryObjects' })).map((row) => row.key)).to.deep.equal([
        'com.example.operation.space.queryObjects',
      ]);
      expect(await run(registry, { query: 'creates nonexistent' })).to.have.length(0);
    });

    test('a skill filter narrows to the operations that skill governs', async ({ expect }) => {
      const registry = twoSkills();
      expect((await run(registry, { skill: 'database' })).map((row) => row.key)).to.deep.equal([
        'com.example.operation.space.queryObjects',
      ]);
      expect(await run(registry, { skill: 'noSuchSkill' })).to.have.length(0);
    });

    test('naming keys is the lookup that returns the schemas', async ({ expect }) => {
      const [row] = await run(testRegistry(), { keys: [KEY] });
      expect(row.key).to.equal(KEY);
      expect(row.schema?.input?.properties?.title).to.exist;
      expect(row.schema?.output).to.exist;
    });

    test('an unknown key contributes nothing rather than failing the search', async ({ expect }) => {
      expect(await run(testRegistry(), { keys: ['org.dxos.nope'] })).to.have.length(0);
    });

    test('an operation registered after startup is findable without a rebuild', async ({ expect }) => {
      const registry = testRegistry({ operations: [] });
      expect(await run(registry)).to.have.length(0);
      registry.add(Operation.serializable([CreateTask]));
      expect((await run(registry)).map((row) => row.key)).to.deep.equal([KEY]);
    });

    // The contract in one motion: which skills exist is dynamic — registry state, not server
    // configuration — and the skill is what carries operations onto the surface. An operation
    // already in the registry stays dark until a skill naming it arrives, and lights up the moment
    // one does.
    test('a skill added at runtime brings its operations with it; nothing leaks before', async ({ expect }) => {
      const registry = testRegistry({ operations: [CreateTask, QueryObjects], skills: [] });
      const { host, invocations } = testHost();
      expect(await run(registry)).to.have.length(0);
      const dark = await EffectEx.runPromise(
        Effect.result(McpServer.invoke(registry, host, { key: 'com.example.operation.space.queryObjects' })),
      );
      expect(failureOf(dark).code).to.equal('invalid_request');
      expect(invocations).to.have.length(0);

      registry.add([makeSkill({ key: 'org.dxos.skill.database', operations: [QueryObjects] })]);
      expect((await run(registry)).map((row) => row.key)).to.deep.equal(['com.example.operation.space.queryObjects']);
      await EffectEx.runPromise(
        McpServer.invoke(registry, host, { key: 'com.example.operation.space.queryObjects', spaceId: SPACE_A }),
      );
      expect(invocations).to.have.length(1);
      // CreateTask is still governed by no skill, so the new arrival widened nothing else.
      expect((await run(registry)).map((row) => row.key)).to.not.include(KEY);
    });

    // A live registry re-syncs its contributions (the CLI's registry-sync capability), so the same
    // key arrives as distinct entities; that is re-registration, not an authorship error.
    test('a re-registered operation lists once, the later registration winning', async ({ expect }) => {
      const registry = testRegistry();
      registry.add(
        Operation.serializable([
          Operation.make({
            meta: { key: DXN.make(KEY), name: 'Create Task', description: 'Re-registered.' },
            input: Schema.Struct({ title: Schema.String }),
            output: Schema.Struct({ id: Schema.String }),
            services: [Database.Service],
          }).pipe(Operation.mutation('write')),
        ]),
      );
      const rows = await run(registry);
      expect(rows.map((row) => row.key)).to.deep.equal([KEY]);
      expect(rows[0].description).to.equal('Re-registered.');
    });
  });

  describe('loadSkill', () => {
    const run = (registry: Registry.Registry, name?: string) =>
      EffectEx.runPromise(Effect.result(McpServer.loadSkillByName(registry, name)));

    const withSkills = () =>
      testRegistry({
        skills: [
          makeSkill({ key: 'org.dxos.skill.codeProject', instructions: 'Bind a space first.' }),
          makeSkill({ key: 'org.dxos.skill.database', instructions: 'Query before writing.' }),
        ],
      });

    test('returns the skill instructions by prompt name, or by full registry key', async ({ expect }) => {
      const registry = withSkills();
      const byName = successOf(await run(registry, 'codeProject'));
      const byKey = successOf(await run(registry, 'dxn:org.dxos.skill.codeProject'));
      expect(byName.instructions).to.equal('Bind a space first.');
      expect(byKey.instructions).to.equal('Bind a space first.');
      expect(byName.skills.map((entry) => entry.name)).to.deep.equal(['codeProject']);
    });

    // With no per-operation tool descriptions left to carry skill pointers, a model that has not
    // called queryOperations yet needs a way to see what workflows exist at all.
    test('no skill named lists them all, without instructions', async ({ expect }) => {
      const listing = successOf(await run(withSkills()));
      expect(listing.skills.map((entry) => entry.name)).to.deep.equal(['codeProject', 'database']);
      expect(listing.instructions).to.be.undefined;
    });

    test('a skill that did not opt in is invisible', async ({ expect }) => {
      const registry = testRegistry({
        skills: [makeSkill({ key: 'org.dxos.skill.internal', mcpPrompt: false })],
      });
      const listing = successOf(await run(registry));
      expect(listing.skills).to.have.length(0);
    });

    test('an unknown skill fails with the available names', async ({ expect }) => {
      expect(failureOf(await run(withSkills(), 'nope')).message).to.include('codeProject');
    });

    test('a re-registered skill lists once, the later registration winning', async ({ expect }) => {
      const registry = withSkills();
      registry.add([makeSkill({ key: 'org.dxos.skill.codeProject', instructions: 'Updated workflow.' })]);
      const listing = successOf(await run(registry, 'codeProject'));
      expect(listing.skills).to.have.length(1);
      expect(listing.instructions).to.equal('Updated workflow.');
    });

    test('a prompt-name collision inside a request is the call failure, not a crash', async ({ expect }) => {
      const registry = testRegistry({
        skills: [
          makeSkill({ key: 'org.dxos.plugin.a.skill.codeProject' }),
          makeSkill({ key: 'org.dxos.plugin.b.skill.codeProject' }),
        ],
      });
      expect(failureOf(await run(registry, 'codeProject')).message).to.include('collision');
    });
  });

  describe('hydrateRegistry', () => {
    test('wire records round-trip into the same surface an in-process registry serves', async ({ expect }) => {
      // What EDGE fetches over its binding: Obj.toJSON records plus flattened skills.
      const wireOperations = Operation.serializable([CreateTask]).map((record) => Obj.toJSON(record));
      const registry = await EffectEx.runPromise(
        McpServer.hydrateRegistry({
          operations: wireOperations,
          skills: [
            {
              key: 'org.dxos.skill.codeProject',
              name: 'Code project',
              mcpPrompt: true,
              // A skill's `tools` carry derived tool names, not operation NSIDs — the form
              // `Skill.toolDefinitions` emits and governance matches on.
              tools: [Operation.toolNameFromKey(KEY)],
              instructions: 'Bind a space first.',
            },
          ],
        }),
      );

      const { operations } = await EffectEx.runPromise(McpServer.queryOperations(registry, {}));
      expect(operations.map((row) => row.key)).to.deep.equal([KEY]);
      expect(operations[0].hints.mutation).to.equal('write');

      const listing = successOf(
        await EffectEx.runPromise(Effect.result(McpServer.loadSkillByName(registry, 'codeProject'))),
      );
      expect(listing.instructions).to.equal('Bind a space first.');

      const { host, invocations } = testHost();
      await EffectEx.runPromise(
        McpServer.invoke(registry, host, { key: KEY, input: { title: 'Ship' }, spaceId: SPACE_A }),
      );
      expect(invocations).to.deep.equal([{ key: KEY, input: { title: 'Ship' }, spaceId: SPACE_A }]);
    });

    // Otherwise an empty-string skill reaches the projection, which drops it with no attributable cause.
    test('a skill whose instructions did not survive the wire is refused at hydration', async ({ expect }) => {
      const registry = await EffectEx.runPromise(
        McpServer.hydrateRegistry({
          operations: Operation.serializable([CreateTask]).map((record) => Obj.toJSON(record)),
          skills: [{ key: 'org.dxos.skill.codeProject', mcpPrompt: true, tools: [KEY] }],
        }),
      );
      const listing = successOf(
        await EffectEx.runPromise(Effect.result(McpServer.loadSkillByName(registry, undefined))),
      );
      expect(listing.skills).to.have.length(0);
      const { operations } = await EffectEx.runPromise(McpServer.queryOperations(registry, {}));
      expect(operations).to.have.length(0);
    });
  });

  describe('normalizeResponse', () => {
    const jsonResponse = (body: unknown) =>
      new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

    const initialize = { jsonrpc: '2.0', id: 1, result: { serverInfo: { name: 'x', version: '1' } } };

    test('unwraps a single-element batch, which the MCP transport requires', async ({ expect }) => {
      const response = await McpServer.normalizeResponse(jsonResponse([initialize]));
      const body = await response.json();
      expect(Array.isArray(body)).to.be.false;
      expect(body.id).to.equal(1);
    });

    test('leaves a multi-element batch alone', async ({ expect }) => {
      const response = await McpServer.normalizeResponse(jsonResponse([initialize, initialize]));
      expect(await response.json()).to.have.length(2);
    });

    test('advertises the shared identity, with host fields layered on top', async ({ expect }) => {
      const icons = McpServer.icons('https://mcp.example');
      const response = await McpServer.normalizeResponse(jsonResponse([initialize]), { serverInfo: { icons } });
      const { serverInfo } = (await response.json()).result;
      expect(serverInfo.title).to.equal(McpServer.identity.title);
      expect(serverInfo.websiteUrl).to.equal(McpServer.identity.websiteUrl);
      expect(serverInfo.icons[0].src).to.equal(`https://mcp.example${McpServer.ICON_LIGHT_PATH}`);
      // The name the layer set is the host's own and must survive the merge.
      expect(serverInfo.name).to.equal('x');
    });

    test('serves the embedded mark for its own paths only', async ({ expect }) => {
      const icon = McpServer.iconResponse(McpServer.ICON_DARK_PATH);
      if (!icon) {
        throw new Error('the mark was not served for its own path');
      }
      expect(icon.headers.get('Content-Type')).to.equal('image/png');
      expect((await icon.arrayBuffer()).byteLength).to.be.greaterThan(0);
      expect(McpServer.iconResponse('/nope.png')).to.be.undefined;
    });

    test('drops a Content-Length the passes above invalidated', async ({ expect }) => {
      const body = JSON.stringify([initialize]);
      const response = await McpServer.normalizeResponse(
        new Response(body, {
          headers: { 'content-type': 'application/json', 'content-length': String(body.length) },
        }),
      );
      expect(response.headers.get('content-length')).to.be.null;
      expect((await response.json()).id).to.equal(1);
    });
  });

  describe('snapshot', () => {
    test('an object reachable by two paths is snapshotted on both', ({ expect }) => {
      const shared = { title: 'shared' };
      const result = McpServer.snapshot({ first: shared, second: shared }) as Record<string, unknown>;
      expect(result).to.deep.equal({ first: shared, second: shared });
      // The second path must reach the snapshot too; returning the input there is how a live entity
      // escapes into a result.
      expect(result.first).to.equal(result.second);
      expect(result.first).to.not.equal(shared);
    });
  });
});

const failureOf = <A>(result: Result.Result<A, McpServer.ToolFailure>): McpServer.ToolFailure => {
  if (result._tag !== 'Failure') {
    throw new Error(`Expected a failure, got: ${JSON.stringify(result.success)}`);
  }
  return result.failure;
};

const successOf = <A>(result: Result.Result<A, McpServer.ToolFailure>): A => {
  if (result._tag !== 'Success') {
    throw new Error(`Expected a success, got: ${result.failure.message}`);
  }
  return result.success;
};

const skillDefinition = (props: { mcpPrompt?: boolean } = {}): Skill.Definition => ({
  key: 'org.dxos.skill.tasks',
  make: () =>
    Skill.make({
      key: 'org.dxos.skill.tasks',
      name: 'Tasks',
      description: 'Task workflow.',
      mcpPrompt: props.mcpPrompt ?? true,
      instructions: Template.make({ source: 'File tasks into the set.' }),
      tools: Skill.toolDefinitions({ operations: [CreateTask] }),
    }),
  operations: [CreateTask],
});

type StubInvocation = { key: string; input: unknown; spaceId?: string };

/** A stub invoker recording each call; `McpServer.host` needs nothing else from the runtime. */
const stubInvoker = (output: unknown = { id: 'T-1' }) => {
  const invocations: StubInvocation[] = [];
  const service: Operation.OperationService = {
    invoke: <I, O>(
      op: Operation.Definition<I, O>,
      ...args: void extends I
        ? [input?: I, options?: Operation.InvokeOptions]
        : [input: I, options?: Operation.InvokeOptions]
    ) => {
      const [input, options] = args;
      invocations.push({ key: String(op.meta.key), input, spaceId: options?.spaceId });
      return Effect.succeed(output as O);
    },
    schedule: () => Effect.void,
    invokePromise: () => Promise.resolve({}),
  };
  return { service, invocations };
};

const buildHost = (definition: Skill.Definition, service: Operation.OperationService) =>
  EffectEx.runPromise(
    McpServer.host({ skills: [definition], spaceIds: [SPACE] }).pipe(Effect.provideService(Operation.Service, service)),
  );

describe('McpServer.fromSkills', () => {
  test('invokes through the ambient Operation.Service, decoding input and passing the space', async ({ expect }) => {
    const { service, invocations } = stubInvoker({ id: 'T-9' });
    const host = await buildHost(skillDefinition(), service);

    const output = await EffectEx.runPromise(host.invoke({ key: KEY, input: { title: 'Ship' }, spaceId: SPACE }));
    expect(output).to.deep.equal({ id: 'T-9' });
    expect(invocations).to.deep.equal([{ key: `dxn:${KEY}`, input: { title: 'Ship' }, spaceId: SPACE }]);
  });

  test('an unknown operation and an invalid space are host errors, not defects', async ({ expect }) => {
    const { service } = stubInvoker();
    const host = await buildHost(skillDefinition(), service);

    const unknown = await EffectEx.runPromise(Effect.result(host.invoke({ key: 'org.dxos.nope' })));
    expect(unknown._tag).to.equal('Failure');

    const invalid = await EffectEx.runPromise(
      Effect.result(host.invoke({ key: KEY, input: { title: 'x' }, spaceId: 'bad' })),
    );
    expect(invalid._tag).to.equal('Failure');
  });

  test('a malformed input fails the call instead of reaching the invoker', async ({ expect }) => {
    const { service, invocations } = stubInvoker();
    const host = await buildHost(skillDefinition(), service);

    const result = await EffectEx.runPromise(Effect.result(host.invoke({ key: KEY, input: { title: 42 } })));
    expect(result._tag).to.equal('Failure');
    expect(invocations).to.have.length(0);
  });
});
