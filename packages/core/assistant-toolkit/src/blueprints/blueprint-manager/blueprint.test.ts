//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AiContextService, AiSessionService } from '@dxos/assistant';
import { Blueprint } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, DXN, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { ObjectId } from '@dxos/keys';
import { trim } from '@dxos/util';

import { DatabaseBlueprint, DiscordBlueprint, MemoryBlueprint } from '../index';
import BlueprintManagerDefinition from './blueprint';
import { BlueprintManagerHandlers, EnableBlueprints, QueryBlueprints } from './functions';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: BlueprintManagerHandlers,
  types: [Blueprint.Blueprint],
  blueprints: [DatabaseBlueprint.make(), MemoryBlueprint.make(), DiscordBlueprint.make()],
  tracing: 'pretty',
});

const provideTestLayers = Effect.provide(AiSessionService.layerNewFeed().pipe(Layer.provideMerge(TestLayer)));

/**
 * Gets the conversation DXN for passing to Operation.invoke options.
 */
const getConversationDxn = Effect.gen(function* () {
  const session = yield* AiSessionService;
  return Obj.getDXN(session.feed).toString() as DXN.String;
});

describe('Blueprint Manager', () => {
  it.effect(
    'query-blueprints: returns all registered blueprints',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* getConversationDxn;
        const result = yield* Operation.invoke(QueryBlueprints, {}, { conversation });
        expect(result).toHaveLength(3);
        const keys = result.map((blueprint: Blueprint.Blueprint) => blueprint.key);
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
        const conversation = yield* getConversationDxn;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          { keys: ['org.dxos.blueprint.database'] },
          { conversation },
        );
        expect(enabled).toHaveLength(1);
        expect(enabled[0].key).toBe('org.dxos.blueprint.database');
        expect(rejected).toHaveLength(0);

        const { binder } = yield* AiContextService;
        const bound = binder.getBlueprints();
        expect(bound.some((bp: Blueprint.Blueprint) => bp.key === 'org.dxos.blueprint.database')).toBe(true);
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
        const conversation = yield* getConversationDxn;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          { keys: ['org.dxos.blueprint.discord'] },
          { conversation },
        );
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.blueprint.discord');

        const { binder } = yield* AiContextService;
        const bound = binder.getBlueprints();
        expect(bound.some((bp: Blueprint.Blueprint) => bp.key === 'org.dxos.blueprint.discord')).toBe(false);
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
        const conversation = yield* getConversationDxn;
        const { enabled, rejected } = yield* Operation.invoke(
          EnableBlueprints,
          {
            keys: ['org.dxos.blueprint.database', 'org.dxos.blueprint.memory', 'org.dxos.blueprint.discord'],
          },
          { conversation },
        );
        expect(enabled).toHaveLength(2);
        const enabledKeys = enabled.map((bp: Blueprint.Blueprint) => bp.key);
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
        const conversation = yield* getConversationDxn;
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

  it.scoped(
    'refresh-blueprints: agent syncs a mutated database blueprint from the registry',
    Effect.fnUntraced(
      function* (_) {
        const registry = yield* Blueprint.RegistryService;
        const canonical = registry.getByKey('org.dxos.blueprint.database');
        expect(canonical).toBeDefined();

        const stored = yield* Blueprint.upsert('org.dxos.blueprint.database');
        const originalName = stored.name;
        Obj.change(stored, (stored) => {
          stored.name = '___TEST_MUTATED_BLUEPRINT_NAME___';
        });
        yield* Database.flush();
        expect(stored.name).toBe('___TEST_MUTATED_BLUEPRINT_NAME___');

        const session = yield* AiSessionService;
        yield* Effect.promise(() => session.context.open());
        yield* Effect.promise(() =>
          session.context.bind({
            blueprints: [Ref.make(BlueprintManagerDefinition.make())],
          }),
        );

        yield* session
          .createRequest({
            system: trim`
            You can call blueprint manager tools. When asked to refresh or sync blueprints from the registry,
            call the refresh blueprints tool once and then stop.
          `,
            prompt: trim`
            Refresh blueprints from the registry so database copies match the built-in definitions.
          `,
          })
          .pipe(Effect.provide(session.makeToolExecutionServices()));

        expect(stored.name).toBe(originalName);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 60_000,
  );
});
