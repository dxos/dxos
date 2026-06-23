//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Blueprint, Operation } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
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

const provideTestLayers = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.provide(Effect.scoped(effect), TestLayer);

/**
 * Creates a conversation feed and a {@link AiContext.Binder} over it. Operations run against the
 * conversation DXN (binding into a process-scoped binder resolved by the test layer); this binder
 * reads the same feed so bindings are visible after `sync()`.
 */
const setupConversation = Effect.gen(function* () {
  const feed = yield* Database.add(Feed.make());
  const runtime = yield* Effect.runtime<Database.Service>();
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
  return { conversation: Obj.getURI(feed), binder };
});

describe('Blueprint Manager', () => {
  it.effect(
    'query-blueprints: returns all registered blueprints',
    Effect.fnUntraced(
      function* (_) {
        const { conversation } = yield* setupConversation;
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
        const { conversation, binder } = yield* setupConversation;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          { keys: ['org.dxos.blueprint.database'] },
          { conversation },
        );
        expect(enabled).toHaveLength(1);
        expect(Obj.getMeta(enabled[0]).key).toBe('org.dxos.blueprint.database');
        expect(rejected).toHaveLength(0);

        yield* Effect.promise(() => binder.sync());
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
        const { conversation, binder } = yield* setupConversation;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          { keys: ['org.dxos.blueprint.discord'] },
          { conversation },
        );
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.blueprint.discord');

        yield* Effect.promise(() => binder.sync());
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
        const { conversation } = yield* setupConversation;
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
        const { conversation } = yield* setupConversation;
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
