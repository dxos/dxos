//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiContext, AiSession } from '@dxos/assistant';
import { Skill, Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';

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

const provideTestLayers = Effect.provide(AiSession.Service.layerNewFeed().pipe(Layer.provideMerge(TestLayer)));

/**
 * Gets the conversation DXN for passing to Operation.invoke options.
 */
const getConversationDXN = Effect.gen(function* () {
  const session = yield* AiSession.Service;
  return Obj.getURI(session.feed);
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

        const { binder } = yield* AiContext.Service;
        const bound = binder.getSkills();
        expect(bound.some((bp: Skill.Skill) => Obj.getMeta(bp).key === 'org.dxos.skill.database')).toBe(
          true,
        );
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

        const { binder } = yield* AiContext.Service;
        const bound = binder.getSkills();
        expect(bound.some((bp: Skill.Skill) => Obj.getMeta(bp).key === 'org.dxos.skill.discord')).toBe(
          false,
        );
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
