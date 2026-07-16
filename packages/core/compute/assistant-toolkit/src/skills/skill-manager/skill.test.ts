//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiContext, Harness } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { EntityId, type URI } from '@dxos/keys';

import { DatabaseSkill, DiscordSkill, MemorySkill } from '../index';
import { SkillManagerHandlers } from './operations';
import { EnableSkills, QuerySkills } from './operations/definitions';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: SkillManagerHandlers,
  types: [Skill.Skill],
  skills: [DatabaseSkill.make(), MemorySkill.make(), DiscordSkill.make()],
  tracing: 'pretty',
});

/** Conversation DXN for the scoped test harness feed. */
class TestConversation extends Context.Tag('@dxos/assistant-toolkit/TestConversation')<
  TestConversation,
  { conversation: URI.URI }
>() {}

const ConversationHarnessLayer = Layer.unwrapScoped(
  Effect.gen(function* () {
    const feed = yield* Database.add(Feed.make());
    const conversation = Obj.getURI(feed);
    const runtime = yield* Effect.runtime<Database.Service>();
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
    'query-skills: returns all registered skills',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const result = yield* Operation.invoke(QuerySkills, {}, { conversation });
        expect(result).toHaveLength(3);
        const keys = result.map((skill: Skill.Skill) => Obj.getMeta(skill).key);
        expect(keys).toContain('org.dxos.skill.database');
        expect(keys).toContain('org.dxos.skill.memory');
        expect(keys).toContain('org.dxos.skill.discord');
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
          { keys: ['org.dxos.skill.database'] },
          { conversation },
        );
        expect(enabled).toHaveLength(1);
        expect(Obj.getMeta(enabled[0]).key).toBe('org.dxos.skill.database');
        expect(rejected).toHaveLength(0);

        const bound = yield* getBoundSkills;
        expect(bound.some((bp: Skill.Skill) => Obj.getMeta(bp).key === 'org.dxos.skill.database')).toBe(true);
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
          { keys: ['org.dxos.skill.discord'] },
          { conversation },
        );
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.skill.discord');

        const bound = yield* getBoundSkills;
        expect(bound.some((bp: Skill.Skill) => Obj.getMeta(bp).key === 'org.dxos.skill.discord')).toBe(false);
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
            keys: ['org.dxos.skill.database', 'org.dxos.skill.memory', 'org.dxos.skill.discord'],
          },
          { conversation },
        );
        expect(enabled).toHaveLength(2);
        const enabledKeys = enabled.map((bp: Skill.Skill) => Obj.getMeta(bp).key);
        expect(enabledKeys).toContain('org.dxos.skill.database');
        expect(enabledKeys).toContain('org.dxos.skill.memory');
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.skill.discord');
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
