//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiContext, AiSession } from '@dxos/assistant';
import { Blueprint, Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';

import { DatabaseBlueprint, DiscordBlueprint, MemoryBlueprint } from '../index';
import { BlueprintManagerHandlers } from './operations';
import { EnableBlueprints, QueryBlueprints } from './operations/definitions';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: BlueprintManagerHandlers,
  types: [Blueprint.Blueprint],
  blueprints: [DatabaseBlueprint.make(), MemoryBlueprint.make(), DiscordBlueprint.make()],
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

describe('Blueprint Manager', () => {
  it.effect(
    'query-blueprints: returns all registered blueprints',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const result = yield* Operation.invoke(QueryBlueprints, {}, { conversation });
        expect(result).toHaveLength(3);
        const keys = result.map((blueprint: Blueprint.Blueprint) => Obj.getMeta(blueprint).key);
        expect(keys).toContain('org.dxos.blueprint.database');
        expect(keys).toContain('org.dxos.blueprint.memory');
        expect(keys).toContain('org.dxos.blueprint.discord');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-blueprints: enables blueprints with agentCanEnable=true',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          { keys: ['org.dxos.blueprint.database'] },
          { conversation },
        );
        expect(enabled).toHaveLength(1);
        expect(Obj.getMeta(enabled[0]).key).toBe('org.dxos.blueprint.database');
        expect(rejected).toHaveLength(0);

        const { binder } = yield* AiContext.Service;
        const bound = binder.getBlueprints();
        expect(bound.some((bp: Blueprint.Blueprint) => Obj.getMeta(bp).key === 'org.dxos.blueprint.database')).toBe(
          true,
        );
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-blueprints: rejects blueprints without agentCanEnable',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          { keys: ['org.dxos.blueprint.discord'] },
          { conversation },
        );
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.blueprint.discord');

        const { binder } = yield* AiContext.Service;
        const bound = binder.getBlueprints();
        expect(bound.some((bp: Blueprint.Blueprint) => Obj.getMeta(bp).key === 'org.dxos.blueprint.discord')).toBe(
          false,
        );
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-blueprints: mixed keys enables only allowed ones',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          {
            keys: ['org.dxos.blueprint.database', 'org.dxos.blueprint.memory', 'org.dxos.blueprint.discord'],
          },
          { conversation },
        );
        expect(enabled).toHaveLength(2);
        const enabledKeys = enabled.map((bp: Blueprint.Blueprint) => Obj.getMeta(bp).key);
        expect(enabledKeys).toContain('org.dxos.blueprint.database');
        expect(enabledKeys).toContain('org.dxos.blueprint.memory');
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.blueprint.discord');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-blueprints: unknown keys are rejected with reason',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDXN;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          { keys: ['org.dxos.blueprint.nonexistent'] },
          { conversation },
        );
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.blueprint.nonexistent');
        expect(rejected[0].reason).toContain('not found');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
