//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext, Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId, type URI } from '@dxos/keys';
import { startTestServer } from '@dxos/mcp-client/testing';

import { AutomationSkill, ChatContextSkill, MemorySkill } from '../index.ts';
import { ConnectMcpServer, EnableSkills, QuerySkills } from './operations/definitions.ts';
import { SkillManagerHandlers } from './operations/index.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: SkillManagerHandlers,
  types: [Skill.Skill],
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

const withTestServer = Effect.acquireRelease(
  Effect.promise(() => startTestServer()),
  (server) => Effect.promise(() => server.close()),
);

/** A skill authored in the space, with no registry entry behind it. */
const addSpaceSkill = (key: 'org.dxos.skill.spaceWeather', props: Partial<Skill.Skill> = {}) =>
  Database.add(Skill.make({ key, name: 'Space Weather', agentCanEnable: true, mcpServers: [], ...props }));

const getBoundSkills = Effect.gen(function* () {
  const binder = yield* Harness.binder;
  yield* Effect.promise(() => binder.sync());
  return binder.getSkills();
});

describe('Skill Manager', () => {
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
  it.effect(
    'enable-skills: enables a skill authored in the space',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        yield* addSpaceSkill('org.dxos.skill.spaceWeather');
        const { enabled, rejected } = yield* Operation.invoke(
          EnableSkills,
          { keys: ['org.dxos.skill.spaceWeather'] },
          { conversation },
        );
        expect(rejected).toHaveLength(0);
        expect(enabled.map((skill: Skill.Skill) => Obj.getMeta(skill).key)).toEqual(['org.dxos.skill.spaceWeather']);

        const bound = yield* getBoundSkills;
        expect(bound.some((skill: Skill.Skill) => Obj.getMeta(skill).key === 'org.dxos.skill.spaceWeather')).toBe(true);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'connect-mcp-server: saves a reachable server, binds the skill and lists its tools',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const server = yield* withTestServer;
        const skill = yield* addSpaceSkill('org.dxos.skill.spaceWeather', {
          mcpServers: [{ name: 'stale', url: server.urls.open, protocol: 'sse' }],
        });

        const { tools } = yield* Operation.invoke(
          ConnectMcpServer,
          {
            skill: 'org.dxos.skill.spaceWeather',
            server: { name: 'weather', url: server.urls.open, protocol: 'http' },
          },
          { conversation },
        );
        expect(tools).toEqual(['get_weather']);
        // The entry with the same url is replaced rather than duplicated.
        expect(skill.mcpServers).toEqual([{ name: 'weather', url: server.urls.open, protocol: 'http' }]);

        const bound = yield* getBoundSkills;
        expect(bound.some((candidate: Skill.Skill) => candidate.id === skill.id)).toBe(true);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'connect-mcp-server: an unreachable server fails with its error and is not saved',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const skill = yield* addSpaceSkill('org.dxos.skill.spaceWeather');
        // Port 1 on loopback refuses the connection.
        const url = 'http://127.0.0.1:1/mcp';

        const exit = yield* Effect.exit(
          Operation.invoke(
            ConnectMcpServer,
            { skill: 'org.dxos.skill.spaceWeather', server: { url, protocol: 'http' } },
            { conversation },
          ),
        );
        if (Exit.isSuccess(exit)) {
          return expect.fail('Expected the connection to fail.');
        }
        expect(Cause.pretty(exit.cause)).toContain(`MCP server ${url} did not connect`);
        expect(skill.mcpServers).toEqual([]);

        const bound = yield* getBoundSkills;
        expect(bound.some((candidate: Skill.Skill) => candidate.id === skill.id)).toBe(false);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'connect-mcp-server: a server refusing the credentials says it needs them',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const server = yield* withTestServer;
        yield* addSpaceSkill('org.dxos.skill.spaceWeather');

        const exit = yield* Effect.exit(
          Operation.invoke(
            ConnectMcpServer,
            { skill: 'org.dxos.skill.spaceWeather', server: { url: server.urls.key, protocol: 'http' } },
            { conversation },
          ),
        );
        if (Exit.isSuccess(exit)) {
          return expect.fail('Expected the connection to fail.');
        }
        expect(Cause.pretty(exit.cause)).toContain('requires credentials');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
