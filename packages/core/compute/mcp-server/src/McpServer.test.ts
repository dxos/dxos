//
// Copyright 2026 DXOS.org
//

import * as McpProtocol from 'effect/ai/McpProtocol';
import * as McpServer$ from 'effect/ai/McpServer';
import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as HttpRouter from 'effect/http/HttpRouter';
import * as Layer from 'effect/Layer';
import type * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Sandbox } from '@dxos/agent-code-mode';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Feed, Obj, Registry, Type } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN, EntityId, SpaceId } from '@dxos/keys';
import { trim } from '@dxos/util';

import * as McpServer from './McpServer.ts';

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

const GET_OBJECTS_KEY = 'com.example.operation.space.getObjects';

/** Replaced by a script's `get`: a script is refused it, while the tool still runs it. */
const GetObjects = Operation.make({
  meta: { key: DXN.make(GET_OBJECTS_KEY), name: 'Get Objects', description: 'Reads objects by reference.' },
  input: Schema.Struct({ objects: Schema.Array(Schema.Unknown) }),
  output: Schema.Struct({ objects: Schema.Array(Schema.Unknown) }),
  services: [Database.Service],
}).pipe(Operation.mutation('none'), Operation.annotate(Operation.ScriptBindingAnnotation, ['get']));

const TASK_TYPENAME = 'com.example.type.task';

class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(
  Schema.Struct({ title: Schema.String, status: Schema.String }),
) {}

/** A real database holding two tasks, for a script's database verbs to act on. */
const taskDatabase = async () => {
  const builder = await new EchoTestBuilder().open();
  const { db } = await builder.createDatabase({ types: [Task, Feed.Feed], assignQueuePositions: true });
  const water = db.add(Obj.make(Task, { title: 'Water the plants', status: 'open' }));
  db.add(Obj.make(Task, { title: 'Ship the release', status: 'done' }));
  await db.flush({ secondaryIndexes: true });
  return { db, water, close: () => builder.close() };
};

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
  // `in`, not a destructuring default: an explicit `undefined` output is a case under test.
  const output = 'output' in options ? options.output : { ok: true };
  const shouldFail = options.fail;
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

/** A gate that admits every call, so a case not about the skill gate is never refused by it. */
const OPEN_GATE: McpServer.SkillGate = {
  issue: () => Effect.succeed('open'),
  verify: () => Effect.succeed(true),
};

const GATE = McpServer.skillGate();

/** The token `loadSkill` returns for `skill` under {@link GATE}. */
const tokenFor = async (registry: Registry.Registry, skill: string): Promise<string | undefined> =>
  (await EffectEx.runPromise(McpServer.loadSkill(registry, GATE, skill))).skillToken;

/** `codeProject` governs CreateTask and `database` governs QueryObjects, so neither token opens the other. */
const twoSkillRegistry = () =>
  testRegistry({
    operations: [CreateTask, QueryObjects],
    skills: [
      makeSkill({ key: 'org.dxos.skill.codeProject', operations: [CreateTask] }),
      makeSkill({ key: 'org.dxos.skill.database', operations: [QueryObjects] }),
    ],
  });

const runInvoke = (
  args: { key?: string; input?: Record<string, unknown>; spaceId?: SpaceId; skillToken?: string },
  options: {
    registry?: Registry.Registry;
    host?: ReturnType<typeof testHost>;
    gate?: McpServer.SkillGate;
  } = {},
) => {
  const registry = options.registry ?? testRegistry();
  const host = options.host ?? testHost();
  return {
    invocations: host.invocations,
    result: EffectEx.runPromise(
      Effect.result(
        McpServer.invoke(
          registry,
          host.host,
          { key: args.key ?? KEY, input: args.input, spaceId: args.spaceId, skillToken: args.skillToken },
          options.gate ?? OPEN_GATE,
        ),
      ),
    ),
  };
};

describe('McpServer', () => {
  describe('invokeOperation', () => {
    // The skill carries conventions an operation's description does not, so a session that skipped
    // it is told exactly which call to make rather than left to guess the input.
    test('refuses an operation called without a skill token, naming the skill', async ({ expect }) => {
      const { invocations, result } = runInvoke({ input: { title: 'x' }, spaceId: SPACE_A }, { gate: GATE });
      const refused = failureOf(await result);
      expect(refused.code).to.equal('skill_not_loaded');
      expect(refused.message).to.include("Call loadSkill with skill: 'codeProject'");
      expect(refused.message).to.include('skillToken');
      expect(invocations).to.have.length(0);
    });

    test("another skill's token does not unlock an operation", async ({ expect }) => {
      const registry = twoSkillRegistry();
      const databaseToken = await tokenFor(registry, 'database');
      const codeProjectToken = await tokenFor(registry, 'codeProject');
      // Words collide one time in a few hundred; the case is meaningless if these two did.
      expect(databaseToken).to.not.equal(codeProjectToken);
      const { invocations, result } = runInvoke(
        { input: { title: 'x' }, spaceId: SPACE_A, skillToken: databaseToken },
        { registry, gate: GATE },
      );
      const refused = failureOf(await result);
      expect(refused.code).to.equal('skill_not_loaded');
      expect(refused.message).to.include(`'${databaseToken}' is not the skillToken`);
      expect(invocations).to.have.length(0);
    });

    test('loading the skill returns the token that unlocks its operations; a listing returns none', async ({
      expect,
    }) => {
      const registry = testRegistry();
      const listing = await EffectEx.runPromise(McpServer.loadSkill(registry, GATE, undefined));
      expect(listing.skillToken).to.be.undefined;

      // By registry key as well as prompt name: both resolve to the same skill, so the same token.
      const byKey = await tokenFor(registry, 'org.dxos.skill.codeProject');
      expect(byKey).to.be.a('string');
      expect(await tokenFor(registry, 'codeProject')).to.equal(byKey);
      const { invocations, result } = runInvoke(
        { input: { title: 'x' }, spaceId: SPACE_A, skillToken: byKey },
        { registry, gate: GATE },
      );
      successOf(await result);
      expect(invocations).to.have.length(1);
    });

    // Concurrent loads on different isolates used to lose one another's record; with nothing
    // recorded, two gates over one secret are interchangeable.
    test('a token issued by one gate is accepted by another over the same secret', async ({ expect }) => {
      const registry = twoSkillRegistry();
      const [codeProjectToken] = await Promise.all([tokenFor(registry, 'codeProject'), tokenFor(registry, 'database')]);
      const { result } = runInvoke(
        { input: { title: 'x' }, spaceId: SPACE_A, skillToken: codeProjectToken?.toUpperCase() },
        { registry, gate: McpServer.skillGate() },
      );
      successOf(await result);
    });

    test('any one of several owning skills is enough', async ({ expect }) => {
      const registry = testRegistry({
        skills: [
          makeSkill({ key: 'org.dxos.skill.codeProject', operations: [CreateTask] }),
          makeSkill({ key: 'org.dxos.skill.database', operations: [CreateTask] }),
        ],
      });
      const refused = failureOf(await runInvoke({ input: { title: 'x' } }, { registry, gate: GATE }).result);
      expect(refused.message).to.include("'codeProject' or 'database'");
      const { result } = runInvoke(
        { input: { title: 'x' }, spaceId: SPACE_A, skillToken: await tokenFor(registry, 'database') },
        { registry, gate: GATE },
      );
      successOf(await result);
    });

    // An unknown key is not a skill problem, and pointing at a skill would send the caller the wrong way.
    test('an unknown operation is reported as unknown, whatever token is passed', async ({ expect }) => {
      const { result } = runInvoke({ key: 'org.dxos.nope' }, { gate: GATE });
      expect(failureOf(await result).code).to.equal('invalid_request');
    });

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

    // `McpServer` refuses to send an encoded result that is not a JSON value as `structuredContent`.
    test('an output travels as its JSON, so its encoding is a JSON value', async ({ expect }) => {
      const output = { id: 'T-1', note: undefined, due: new Date(0) };
      const { result } = runInvoke({ input: { title: 'x' }, spaceId: SPACE_A }, { host: testHost({ output }) });
      const success = successOf(await result);
      expect(success).to.deep.equal({ id: 'T-1', due: '1970-01-01T00:00:00.000Z' });
      const encoded = Schema.encodeUnknownSync(McpServer.InvokeOperation.successSchema)(success);
      expect(Schema.is(Schema.Json)(encoded)).to.be.true;
    });

    test('a void output or an undefined field still yields JSON structured content', async ({ expect }) => {
      const run = async (output: unknown) =>
        successOf(await runInvoke({ input: { title: 'x' }, spaceId: SPACE_A }, { host: testHost({ output }) }).result);
      expect(await run(undefined)).to.deep.equal({});
      expect(Object.keys(await run({ id: 'T-1', note: undefined }))).to.deep.equal(['id']);
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

    // Dropping it silently leaves the declared fields undefined, and a handler reading that as
    // "no filter given" answers a misspelled search with everything it has, as a success.
    test('a property the schema does not declare is rejected rather than dropped', async ({ expect }) => {
      const { result, invocations } = runInvoke({ input: { title: 'x', titel: 'x' }, spaceId: SPACE_A });
      expect(failureOf(await result).code).to.equal('invalid_request');
      expect(failureOf(await result).message).to.include('titel');
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

    // `McpServer` refuses to send an encoded result that is not a JSON value as `structuredContent`.
    test('an encoded row is a JSON value for an operation declaring no optional hints', async ({ expect }) => {
      const registry = testRegistry({
        operations: [QueryPlugins],
        skills: [makeSkill({ key: 'org.dxos.skill.registry', operations: [QueryPlugins] })],
      });
      const operations = await run(registry, { keys: ['com.example.operation.registry.queryPlugins'] });
      expect(operations).to.have.length(1);
      const encoded = Schema.encodeUnknownSync(McpServer.QueryOperations.successSchema)({ operations });
      expect(Schema.is(Schema.Json)(encoded)).to.be.true;
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
        Effect.result(McpServer.invoke(registry, host, { key: 'com.example.operation.space.queryObjects' }, OPEN_GATE)),
      );
      expect(failureOf(dark).code).to.equal('invalid_request');
      expect(invocations).to.have.length(0);

      registry.add([makeSkill({ key: 'org.dxos.skill.database', operations: [QueryObjects] })]);
      expect((await run(registry)).map((row) => row.key)).to.deep.equal(['com.example.operation.space.queryObjects']);
      await EffectEx.runPromise(
        McpServer.invoke(
          registry,
          host,
          { key: 'com.example.operation.space.queryObjects', spaceId: SPACE_A },
          OPEN_GATE,
        ),
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

  describe('runScript', () => {
    /**
     * Runs `code` against a real database holding two tasks, its `ops` calls reaching {@link testHost}. Read what a
     * test needs before the database closes.
     */
    const run = async (
      code: string,
      options: {
        registry?: Registry.Registry;
        skillTokens?: readonly string[];
        spaceId?: SpaceId;
        timeout?: number;
        withoutDatabase?: boolean;
      } = {},
    ) => {
      const { db, water, close } = await taskDatabase();
      try {
        const { host, invocations } = testHost({ spaceIds: [db.spaceId] });
        const result = await EffectEx.runPromise(
          McpServer.runScript(
            options.registry ?? testRegistry(),
            options.withoutDatabase ? host : { ...host, database: () => Effect.succeed(db) },
            GATE,
            { code, spaceId: options.spaceId ?? db.spaceId, skillTokens: options.skillTokens },
            { sandbox: Sandbox.inProcess, ...(options.timeout === undefined ? {} : { timeout: options.timeout }) },
          ),
        );
        return { ...result, invocations, spaceId: db.spaceId, waterStatus: water.status };
      } finally {
        await close();
      }
    };

    const codeProjectToken = async () => [(await tokenFor(testRegistry(), 'codeProject')) ?? ''];

    // The point of code mode: a loop the caller would otherwise spend one round trip per item on.
    test('a loop runs operations through ops and the skill gate, in the script space', async ({ expect }) => {
      const { output, error, stats, invocations, spaceId } = await run(
        trim`
          for (const title of ['a', 'b', 'c']) {
            const { ok } = await ops['${KEY}']({ title });
            print(\`\${title} \${ok}\`);
          }
        `,
        { skillTokens: await codeProjectToken() },
      );
      expect(error).to.be.undefined;
      expect(output).to.equal('a true\nb true\nc true');
      expect(stats?.calls).to.equal(3);
      expect(stats?.callMs).to.be.at.least(0);
      expect(invocations.map(({ input, spaceId }) => ({ input, spaceId }))).to.deep.equal(
        ['a', 'b', 'c'].map((title) => ({ input: { title }, spaceId })),
      );
    });

    test('a call without its skill token throws, saying where the token goes', async ({ expect }) => {
      const { output, error, invocations } = await run(
        trim`
          try {
            await ops['${KEY}']({ title: 'x' });
          } catch (error) {
            print(error.message);
          }
        `,
      );
      expect(error).to.be.undefined;
      expect(output).to.include('skill_not_loaded');
      expect(output).to.include("Call loadSkill with skill: 'codeProject'");
      expect(output).to.include("pass it in runScript's skillTokens");
      expect(invocations).to.have.length(0);
    });

    // A token is checked against the gate's derivation, so a forged one opens nothing.
    test('a token the gate did not issue is refused', async ({ expect }) => {
      const { error, invocations } = await run(`await ops['${KEY}']({ title: 'x' });`, { skillTokens: ['forged'] });
      expect(error).to.include('skill_not_loaded');
      expect(invocations).to.have.length(0);
    });

    test('an uncaught failure is the last line, after what was printed', async ({ expect }) => {
      const { output, error } = await run(`print('before'); throw new Error('boom');`);
      expect(output).to.equal('before\nError: boom');
      expect(error).to.equal('Error: boom');
    });

    // Found by the code-mode eval: a pagination loop passes `{ after: undefined }` on its first call.
    test('an undefined input field is dropped, as JSON would drop it', async ({ expect }) => {
      const { error, invocations } = await run(
        trim`
          let after;
          await ops['${KEY}']({ title: 'x', after });
        `,
        { skillTokens: await codeProjectToken() },
      );
      expect(error).to.be.undefined;
      expect(invocations[0]?.input).to.deep.equal({ title: 'x' });
    });

    test('the plain bindings read and change the space database without an operation', async ({ expect }) => {
      const { output, error, stats, invocations, waterStatus } = await run(
        trim`
          const open = await query('${TASK_TYPENAME}', { status: 'open' });
          const found = await search('release', '${TASK_TYPENAME}');
          const task = await get(open[0].id);
          update(task, (task) => { task.status = 'done'; });
          await flush();
          const missing = await get('${EntityId.random()}');
          print(\`\${open.length}|\${found.map((row) => row.title).join()}|\${task.title}|\${missing === undefined}\`);
        `,
      );
      expect(error).to.be.undefined;
      expect(output).to.equal('1|Ship the release|Water the plants|true');
      expect(stats?.calls).to.equal(0);
      expect(invocations).to.have.length(0);
      // Changed in the host's database, not in a copy.
      expect(waterStatus).to.equal('done');
    });

    test('an operation a binding replaces is not in ops, while the tool still runs it', async ({ expect }) => {
      const skill = makeSkill({ key: 'org.dxos.skill.codeProject', operations: [CreateTask, GetObjects] });
      const registry = testRegistry({ operations: [CreateTask, GetObjects], skills: [skill] });
      const { output, error, invocations } = await run(
        trim`
          try {
            await ops['${GET_OBJECTS_KEY}']({ objects: [] });
          } catch (error) {
            print(error.message);
          }
          print(typeof ops['${KEY}']);
        `,
        { registry },
      );
      expect(error).to.be.undefined;
      const [refusal, offered] = output.split('\n');
      expect(refusal).to.include('is not offered in code');
      expect(offered).to.equal('function');
      expect(invocations).to.have.length(0);

      // The tool still lists and runs it, for a client that is not writing code.
      const listed = await EffectEx.runPromise(McpServer.queryOperations(registry, { keys: [GET_OBJECTS_KEY] }));
      expect(listed.operations.map((row) => row.key)).to.deep.equal([GET_OBJECTS_KEY]);
      const tool = runInvoke({ key: GET_OBJECTS_KEY, input: { objects: [] }, spaceId: SPACE_A }, { registry });
      expect((await tool.result)._tag).to.equal('Success');
    });

    test('a program that outruns its budget is abandoned with an error', async ({ expect }) => {
      const { error } = await run(`await new Promise(() => {});`, { timeout: 50 });
      expect(error).to.include('abandoned');
    });

    test('a host that gives scripts no database runs none', async ({ expect }) => {
      const { error } = await run(`print('never');`, { withoutDatabase: true });
      expect(error).to.include('gives them no database');
    });

    test('a space outside the session is refused before the program runs', async ({ expect }) => {
      const { output, error } = await run(`print('never');`, { spaceId: SPACE_B });
      expect(error).to.include('space_not_in_context');
      expect(output).not.to.include('never');
    });

    // EDGE's MCP router runs no code: it hands the request to compute-service, which governs the script's calls.
    test('a host that names a runner hands it the script as a plain-dialect request', async ({ expect }) => {
      const requests: Operation.ScriptRequest[] = [];
      const runner: Operation.ScriptRunner = {
        run: (request) =>
          Effect.sync(() => {
            requests.push(request);
            return { output: 'ran there', stats: { calls: 2, callMs: 7 } };
          }),
      };
      const { host } = testHost({ spaceIds: [SPACE_A] });
      const run = (spaceId: SpaceId) =>
        EffectEx.runPromise(
          McpServer.runScript(
            testRegistry(),
            host,
            GATE,
            { code: "print('x');", spaceId, skillTokens: ['token'] },
            { runner, timeout: 5_000, maxOutput: 100 },
          ),
        );

      expect(await run(SPACE_A)).to.deep.equal({ output: 'ran there', stats: { calls: 2, callMs: 7 } });
      expect(requests).to.deep.equal([
        {
          source: Operation.inlineScript("print('x');", { dialect: Operation.ScriptDialects.Plain }),
          spaceId: SPACE_A,
          skillTokens: ['token'],
          timeoutMs: 5_000,
          maxOutput: 100,
        },
      ]);

      // The session's spaces are checked before the script leaves.
      expect((await run(SPACE_B)).error).to.include('space_not_in_context');
      expect(requests).to.have.length(1);
    });

    test('nothing outside the bindings is in scope by name', async ({ expect }) => {
      const { output } = await run(
        'print([typeof invoke, typeof registry, typeof host, typeof Effect, typeof ops, typeof get].join());',
      );
      expect(output).to.equal('undefined,undefined,undefined,undefined,object,function');
    });
  });

  describe('formatScriptAnswer', () => {
    test('prints the output, then the trailer', ({ expect }) => {
      expect(McpServer.formatScriptAnswer({ output: 'a\nb', stats: { calls: 3, callMs: 41 } }, 52.4)).to.equal(
        'a\nb\n---\n3 calls · 41 ms in calls · 52 ms total',
      );
    });

    test('a failure a runner only reported is added after the output', ({ expect }) => {
      expect(McpServer.formatScriptAnswer({ output: '', error: 'runner unavailable' }, 3)).to.equal(
        'Error: runner unavailable\n---\n3 ms total',
      );
    });

    test('a script that made no count reports only the total', ({ expect }) => {
      expect(McpServer.formatScriptAnswer({ output: 'Error: offline', error: 'Error: offline' }, 3)).to.equal(
        'Error: offline\n---\n3 ms total',
      );
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
        await EffectEx.runPromise(Effect.result(McpServer.loadSkill(registry, GATE, 'codeProject'))),
      );
      expect(listing.instructions).to.equal('Bind a space first.');

      const { host, invocations } = testHost();
      await EffectEx.runPromise(
        McpServer.invoke(
          registry,
          host,
          { key: KEY, input: { title: 'Ship' }, spaceId: SPACE_A, skillToken: listing.skillToken },
          GATE,
        ),
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

    const discover = {
      jsonrpc: '2.0',
      id: 1,
      result: {
        supportedVersions: ['2026-07-28'],
        _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'x', version: '1' } },
      },
    };

    const listChanged = { jsonrpc: '2.0', method: 'notifications/tools/list_changed', params: {} };

    const eventStream = (body: string, headers: Record<string, string> = {}) =>
      new Response(body, { headers: { 'content-type': 'text/event-stream', ...headers } });

    const frames = (...messages: unknown[]) =>
      messages.map((message) => `data: ${JSON.stringify(message)}\n\n`).join('');

    const post = (headers: Record<string, string> = {}) =>
      new Request('https://mcp.example/mcp', { method: 'POST', headers });

    test('advertises the shared identity, with host fields layered on top', async ({ expect }) => {
      const icons = McpServer.icons('https://mcp.example');
      const response = await McpServer.normalizeResponse(jsonResponse(discover), { serverInfo: { icons } });
      const serverInfo = (await response.json()).result._meta['io.modelcontextprotocol/serverInfo'];
      expect(serverInfo.title).to.equal(McpServer.identity.title);
      expect(serverInfo.websiteUrl).to.equal(McpServer.identity.websiteUrl);
      expect(serverInfo.icons[0].src).to.equal(`https://mcp.example${McpServer.ICON_PATH}`);
      // The name the layer set is the host's own and must survive the merge.
      expect(serverInfo.name).to.equal('x');
    });

    test('serves the embedded mark for its own paths only', async ({ expect }) => {
      for (const [path, contentType] of [
        [McpServer.ICON_PATH, 'image/png'],
        [McpServer.FAVICON_PATH, 'image/x-icon'],
      ]) {
        const icon = McpServer.iconResponse(path);
        if (!icon) {
          throw new Error(`the mark was not served for ${path}`);
        }
        expect(icon.headers.get('Content-Type')).to.equal(contentType);
        expect((await icon.arrayBuffer()).byteLength).to.be.greaterThan(0);
      }
      expect(McpServer.iconResponse('/nope.png')).to.be.undefined;
    });

    test('drops a Content-Length the passes above invalidated', async ({ expect }) => {
      const body = JSON.stringify(discover);
      const response = await McpServer.normalizeResponse(
        new Response(body, {
          headers: { 'content-type': 'application/json', 'content-length': String(body.length) },
        }),
      );
      expect(response.headers.get('content-length')).to.be.null;
      expect((await response.json()).id).to.equal(1);
    });

    test('collapses a POST event stream to its lone response, decorated', async ({ expect }) => {
      const body = frames(listChanged, discover);
      const response = await McpServer.normalizeResponse(
        eventStream(body, { 'content-length': String(body.length), 'mcp-session-id': 'session' }),
        { request: post() },
      );
      expect(response.status).to.equal(200);
      expect(response.headers.get('content-type')).to.equal('application/json');
      expect(response.headers.get('content-length')).to.be.null;
      expect(response.headers.get('mcp-session-id')).to.equal('session');
      const message = await response.json();
      expect(message.id).to.equal(1);
      expect(message.result._meta['io.modelcontextprotocol/serverInfo'].title).to.equal(McpServer.identity.title);
    });

    test('answers a stream holding only notifications with 202', async ({ expect }) => {
      const response = await McpServer.normalizeResponse(eventStream(frames(listChanged, listChanged)), {
        request: post(),
      });
      expect(response.status).to.equal(202);
      expect(response.headers.get('content-type')).to.be.null;
      expect(await response.text()).to.equal('');
    });

    test('passes an ambiguous or unparseable stream through unchanged', async ({ expect }) => {
      for (const body of [
        frames(listChanged, discover, { ...discover, id: 2 }),
        frames({ ...discover, error: { code: -32603, message: 'boom' } }),
        `data: {"jsonrpc":\n\n`,
      ]) {
        const response = await McpServer.normalizeResponse(eventStream(body), { request: post() });
        expect(response.headers.get('content-type')).to.equal('text/event-stream');
        expect(await response.text()).to.equal(body);
      }
    });

    test('never reads a stream that may not end', async ({ expect }) => {
      // Never closed, so reading it would hang the test.
      const open = () =>
        new Response(
          new ReadableStream({
            start: (controller) => controller.enqueue(new TextEncoder().encode(frames(listChanged))),
          }),
          { headers: { 'content-type': 'text/event-stream' } },
        );
      for (const options of [{ request: post({ 'mcp-method': 'subscriptions/listen' }) }, {}]) {
        const stream = open();
        const response = await McpServer.normalizeResponse(stream, options);
        expect(response).to.equal(stream);
        expect(response.bodyUsed).to.be.false;
        await response.body?.cancel();
      }
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

describe('McpServer.toolsLayer', () => {
  const PROTOCOL_VERSION = '2026-07-28';

  /** Serves `toolsLayer` over effect's HTTP transport, counting how often the registry resolves. */
  const serve = (registry: Effect.Effect<Registry.Registry, McpServer.ToolFailure>) => {
    const { host } = testHost();
    return HttpRouter.toWebHandler(
      McpServer.toolsLayer().pipe(
        Layer.provide(Layer.succeed(McpServer.RegistrySource, McpServer.RegistrySource.of({ registry }))),
        Layer.provide(Layer.succeed(McpServer.Host, host)),
        Layer.provide(
          McpServer$.layerHttp({ name: 'test', version: '0.0.0', path: '/mcp', protocols: [McpProtocol.v2026_07_28] }),
        ),
      ),
    );
  };

  const send = async (
    handler: (request: Request) => Promise<Response>,
    method: string,
    params: Record<string, unknown> = {},
  ) => {
    const response = await handler(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json, text/event-stream',
          'mcp-protocol-version': PROTOCOL_VERSION,
          'mcp-method': method,
          ...(typeof params.name === 'string' ? { 'mcp-name': params.name } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params: {
            ...params,
            _meta: {
              'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
              'io.modelcontextprotocol/clientCapabilities': {},
            },
          },
        }),
      }),
    );
    return McpServer.normalizeResponse(response, { request: { method: 'POST', headers: new Headers() } }).then(
      (normalized) => normalized.json(),
    );
  };

  test('lists its tools without resolving the registry, and resolves it for the call that needs it', async ({
    expect,
  }) => {
    let resolved = 0;
    const registry = testRegistry();
    const { handler, dispose } = serve(
      Effect.sync(() => {
        resolved++;
        return registry;
      }),
    );
    try {
      const listed = await send(handler, 'tools/list');
      expect(listed.result.tools.map((tool: { name: string }) => tool.name)).to.have.members([...McpServer.TOOL_NAMES]);
      expect(resolved).to.equal(0);

      const called = await send(handler, 'tools/call', { name: 'queryOperations', arguments: {} });
      expect(called.result.isError).not.to.equal(true);
      expect(resolved).to.equal(1);
    } finally {
      await dispose();
    }
  });

  test('a registry that fails to resolve fails the call, not the surface', async ({ expect }) => {
    const { handler, dispose } = serve(
      Effect.fail(McpServer.failure('operation_failed', 'the operation registry is unavailable')),
    );
    try {
      const listed = await send(handler, 'tools/list');
      expect(listed.result.tools).to.have.length(McpServer.TOOL_NAMES.length);

      const called = await send(handler, 'tools/call', { name: 'queryOperations', arguments: {} });
      expect(called.result.isError).to.equal(true);
      expect(JSON.stringify(called.result.content)).to.include('registry is unavailable');
    } finally {
      await dispose();
    }
  });

  test('skill prompts registered on a running server appear in prompts/list', async ({ expect }) => {
    let serverContext: Context.Context<McpServer$.McpServer> | undefined;
    const captureServer = Layer.effectDiscard(
      Effect.map(Effect.context<McpServer$.McpServer>(), (context) => {
        serverContext = context;
      }),
    );
    const { handler, dispose } = HttpRouter.toWebHandler(
      Layer.mergeAll(McpServer.toolsLayer(), captureServer).pipe(
        Layer.provide(Layer.succeed(McpServer.RegistrySource, McpServer.RegistrySource.of({ registry: Effect.never }))),
        Layer.provide(Layer.succeed(McpServer.Host, testHost().host)),
        Layer.provide(
          McpServer$.layerHttp({ name: 'test', version: '0.0.0', path: '/mcp', protocols: [McpProtocol.v2026_07_28] }),
        ),
      ),
    );
    try {
      const before = await send(handler, 'prompts/list');
      expect(before.result?.prompts ?? []).to.have.length(0);

      expect(serverContext).toBeDefined();
      if (serverContext) {
        await EffectEx.runPromise(McpServer.registerPrompts(testRegistry()).pipe(Effect.provide(serverContext)));
      }
      const after = await send(handler, 'prompts/list');
      expect(after.result.prompts.map((prompt: { name: string }) => prompt.name)).to.deep.equal(['codeProject']);
    } finally {
      await dispose();
    }
  });

  test('code mode adds runScript, accepting the skillToken the loadSkill tool issued', async ({ expect }) => {
    const registry = testRegistry();
    const { db, close } = await taskDatabase();
    const { host, invocations } = testHost({ spaceIds: [db.spaceId] });
    const { handler, dispose } = HttpRouter.toWebHandler(
      McpServer.toolsLayer({ script: { sandbox: Sandbox.inProcess } }).pipe(
        Layer.provide(
          Layer.succeed(McpServer.RegistrySource, McpServer.RegistrySource.of({ registry: Effect.succeed(registry) })),
        ),
        Layer.provide(Layer.succeed(McpServer.Host, { ...host, database: () => Effect.succeed(db) })),
        Layer.provide(
          McpServer$.layerHttp({ name: 'test', version: '0.0.0', path: '/mcp', protocols: [McpProtocol.v2026_07_28] }),
        ),
      ),
    );
    try {
      const listed = await send(handler, 'tools/list');
      expect(listed.result.tools.map((tool: { name: string }) => tool.name)).to.have.members([
        ...McpServer.TOOL_NAMES,
        McpServer.RunScript.name,
      ]);

      const loaded = await send(handler, 'tools/call', { name: 'loadSkill', arguments: { skill: 'codeProject' } });
      const called = await send(handler, 'tools/call', {
        name: 'runScript',
        arguments: {
          code: `print((await ops['${KEY}']({ title: 'x' })).ok);`,
          spaceId: db.spaceId,
          skillTokens: [loaded.result.structuredContent.skillToken],
        },
      });
      expect(called.result.isError).not.to.equal(true);
      expect(called.result.structuredContent).to.be.undefined;
      const [content] = called.result.content;
      expect(content.type).to.equal('text');
      expect(content.text).to.match(/^true\n---\n1 call · \d+ ms in calls · \d+ ms total$/);
      expect(invocations).to.have.length(1);

      const failed = await send(handler, 'tools/call', {
        name: 'runScript',
        arguments: { code: `print('before'); throw new Error('boom');`, spaceId: db.spaceId },
      });
      expect(failed.result.isError).to.equal(true);
      expect(failed.result.content[0].text).to.match(/^before\nError: boom\n---\n0 calls · /);

      const descriptor = listed.result.tools.find((tool: { name: string }) => tool.name === 'runScript');
      expect(descriptor.outputSchema).to.be.undefined;
      expect(descriptor.inputSchema.properties).to.have.property('code');
    } finally {
      await dispose();
      await close();
    }
  });

  test('a host tool that takes one of its names is refused at build', async ({ expect }) => {
    const colliding = McpServer.toolsLayer({ reservedToolNames: ['invokeOperation'] }).pipe(
      Layer.provide(Layer.succeed(McpServer.RegistrySource, McpServer.RegistrySource.of({ registry: Effect.never }))),
      Layer.provide(Layer.succeed(McpServer.Host, testHost().host)),
    );
    const exit = await EffectEx.runPromise(Effect.exit(Effect.scoped(Layer.build(colliding))));
    expect(exit._tag).to.equal('Failure');
    expect(String(exit._tag === 'Failure' ? exit.cause : '')).to.include('collision');
  });
});

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
