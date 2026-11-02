//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext, Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Registry } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId, type URI } from '@dxos/keys';
import { AccessToken, Connection } from '@dxos/link';
import { startTestServer } from '@dxos/mcp-client/testing';

import { AutomationSkill, ChatContextSkill, MemorySkill } from '../index.ts';
import {
  AddMcpConnection,
  EnableSkills,
  QueryMcpConnections,
  QuerySkills,
  SetMcpConnection,
} from './operations/definitions.ts';
import { SkillManagerHandlers } from './operations/index.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: SkillManagerHandlers,
  types: [AccessToken.AccessToken, Connection.Connection, Skill.Skill],
  skills: [ChatContextSkill.make(), MemorySkill.make(), AutomationSkill.make()],
  tracing: 'pretty',
});

/** Conversation DXN for the scoped test harness feed. */
class TestConversation extends Context.Service<TestConversation, { conversation: URI.URI }>()(
  '@dxos/assistant-toolkit/TestConversation',
) {}

const ConversationHarnessLayer = Layer.unwrap(
  Effect.gen(function* () {
    const feed = yield* Database.add(Feed.make());
    const conversation = Obj.getURI(feed);
    const runtime = yield* Effect.context<Database.Service>();
    const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
    return Layer.mergeAll(
      Layer.succeed(TestConversation, { conversation }),
      Layer.succeed(Harness.HarnessService, Harness.fromBinder({ feed, runtime, binder })),
    );
  }),
);

const provideTestLayers = Effect.provide(ConversationHarnessLayer.pipe(Layer.provideMerge(TestLayer)));

const getConversationDXN = Effect.gen(function* () {
  const { conversation } = yield* TestConversation;
  return conversation;
});

const getBoundSkills = Effect.gen(function* () {
  const binder = yield* Harness.binder;
  yield* Effect.promise(() => binder.sync());
  return binder.getSkills();
});

describe('Skill Manager', () => {
  it.effect(
    'set-mcp-connection: turns a connection off for this conversation only',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const connection = yield* Database.add(Connection.make({ name: 'GitHub', connectorId: 'github-app' }));

        const before = yield* Operation.invoke(QueryMcpConnections, {}, { conversation });
        yield* Operation.invoke(SetMcpConnection, { id: connection.id, enabled: false }, { conversation });
        const after = yield* Operation.invoke(QueryMcpConnections, {}, { conversation });

        expect(before.map(({ enabled }) => enabled)).toEqual([true]);
        expect(after.map(({ enabled }) => enabled)).toEqual([false]);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'set-mcp-connection: turns a built-in server on by its key; it is listed off until then',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        (yield* Registry.Service).add([
          Connection.makeBuiltin({
            key: 'org.dxos.mcp.test',
            name: 'Test',
            mcp: { url: 'https://mcp.example.com/mcp', protocol: 'http' },
          }),
        ]);

        const before = yield* Operation.invoke(QueryMcpConnections, {}, { conversation });
        yield* Operation.invoke(SetMcpConnection, { id: 'org.dxos.mcp.test', enabled: true }, { conversation });
        const after = yield* Operation.invoke(QueryMcpConnections, {}, { conversation });

        expect(before).toEqual([{ id: 'org.dxos.mcp.test', name: 'Test', enabled: false, builtin: true }]);
        expect(after.map(({ enabled }) => enabled)).toEqual([true]);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'add-mcp-connection: adding a server the space already has turns that connection on with the latest key',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const server = yield* Effect.acquireRelease(
          Effect.promise(() => startTestServer()),
          (server) => Effect.promise(() => server.close()),
        );

        const added = yield* Operation.invoke(
          AddMcpConnection,
          { url: server.urls.key, key: server.apiKey },
          { conversation },
        );
        yield* Operation.invoke(SetMcpConnection, { id: added.id, enabled: false }, { conversation });

        // No key this time: the stored one answers the probe, and the connection is switched back on.
        const again = yield* Operation.invoke(AddMcpConnection, { url: server.urls.key }, { conversation });
        expect(again.id).toBe(added.id);
        expect(again.enabled).toBe(true);
        const listed = yield* Operation.invoke(QueryMcpConnections, {}, { conversation });
        expect(listed.find(({ id }) => id === added.id)?.enabled).toBe(true);

        // A new key replaces the old one rather than leaving it in the space.
        yield* Operation.invoke(AddMcpConnection, { url: server.urls.key, key: server.apiKey }, { conversation });
        const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
        expect(connections.map(({ mcp }) => mcp?.url)).toEqual([server.urls.key]);
        expect(yield* Database.query(Filter.type(AccessToken.AccessToken)).run).toHaveLength(1);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'add-mcp-connection: a re-add keeps the endpoint it probed',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const server = yield* Effect.acquireRelease(
          Effect.promise(() => startTestServer()),
          (server) => Effect.promise(() => server.close()),
        );
        const connection = yield* Database.add(
          Connection.make({ connectorId: 'mcp', name: 'open', mcp: { url: server.urls.open, protocol: 'sse' } }),
        );

        // The reply describes the endpoint that answered, so the connection dials that one from now on.
        yield* Operation.invoke(AddMcpConnection, { url: server.urls.open, protocol: 'http' }, { conversation });
        expect(connection.mcp).toEqual({ url: server.urls.open, protocol: 'http' });
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'add-mcp-connection: adds a server that answers, and refuses one that needs sign-in',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const server = yield* Effect.acquireRelease(
          Effect.promise(() => startTestServer()),
          (server) => Effect.promise(() => server.close()),
        );

        const open = yield* Operation.invoke(AddMcpConnection, { url: server.urls.open }, { conversation });
        const keyed = yield* Operation.invoke(
          AddMcpConnection,
          { url: server.urls.key, key: server.apiKey },
          { conversation },
        );
        const refused = yield* Operation.invoke(AddMcpConnection, { url: server.urls.oauth }, { conversation }).pipe(
          Effect.exit,
        );

        expect(open.tools).toContain('get_weather');
        expect(keyed.problem).toBeUndefined();
        expect(refused._tag).toBe('Failure');
        const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
        expect(connections.map(({ mcp }) => mcp?.url)).toEqual([server.urls.open, server.urls.key]);
        expect(connections[1].accessToken).toBeDefined();
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'query-skills: returns all registered skills',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const result = yield* Operation.invoke(QuerySkills, {}, { conversation });
        expect(result).toHaveLength(3);
        const keys = result.map((skill: Skill.Skill) => Obj.getMeta(skill).key);
        expect(keys).toContain('org.dxos.skill.chatContext');
        expect(keys).toContain('org.dxos.skill.memory');
        expect(keys).toContain('org.dxos.skill.automation');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'query-skills: finds the skill providing a tool by words describing it',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const result = yield* Operation.invoke(QuerySkills, { query: 'save a memory' }, { conversation });
        expect(result.map((skill: Skill.Skill) => Obj.getMeta(skill).key)[0]).toBe('org.dxos.skill.memory');
        // Each result names its tools, which is how the model tells it has found the right one.
        expect(result[0].tools.length).toBeGreaterThan(0);

        const none = yield* Operation.invoke(QuerySkills, { query: 'zzzz' }, { conversation });
        expect(none).toHaveLength(0);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-skills: enables skills with agentCanEnable=true',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableSkills,
          { keys: ['org.dxos.skill.chatContext'] },
          { conversation },
        );
        expect(enabled).toHaveLength(1);
        expect(Obj.getMeta(enabled[0]).key).toBe('org.dxos.skill.chatContext');
        expect(rejected).toHaveLength(0);

        const bound = yield* getBoundSkills;
        expect(bound.some((bp: Skill.Skill) => Obj.getMeta(bp).key === 'org.dxos.skill.chatContext')).toBe(true);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-skills: rejects skills without agentCanEnable',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableSkills,
          { keys: ['org.dxos.skill.automation'] },
          { conversation },
        );
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.skill.automation');

        const bound = yield* getBoundSkills;
        expect(bound.some((bp: Skill.Skill) => Obj.getMeta(bp).key === 'org.dxos.skill.automation')).toBe(false);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-skills: mixed keys enables only allowed ones',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableSkills,
          {
            keys: ['org.dxos.skill.chatContext', 'org.dxos.skill.memory', 'org.dxos.skill.automation'],
          },
          { conversation },
        );
        expect(enabled).toHaveLength(2);
        const enabledKeys = enabled.map((bp: Skill.Skill) => Obj.getMeta(bp).key);
        expect(enabledKeys).toContain('org.dxos.skill.chatContext');
        expect(enabledKeys).toContain('org.dxos.skill.memory');
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.skill.automation');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-skills: unknown keys are rejected with reason',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableSkills,
          { keys: ['org.dxos.skill.nonexistent'] },
          { conversation },
        );
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.skill.nonexistent');
        expect(rejected[0].reason).toContain('not found');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
