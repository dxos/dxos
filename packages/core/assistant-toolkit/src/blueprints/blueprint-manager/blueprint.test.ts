//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AiContextService, AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { trim } from '@dxos/util';

import DatabaseBlueprint from '../database/blueprint';
import MarkdownBlueprint from '../markdown/blueprint';
import ResearchBlueprint from '../research/blueprint';
import BlueprintManagerDefinition from './blueprint';
import { BlueprintManagerHandlers, EnableBlueprints, QueryBlueprints } from './functions';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: BlueprintManagerHandlers,
  types: [Blueprint.Blueprint],
  blueprints: [DatabaseBlueprint.make(), MarkdownBlueprint.make(), ResearchBlueprint.make()],
  tracing: 'pretty',
});

const provideTestLayers = Effect.provide(AiConversationService.layerNewFeed().pipe(Layer.provideMerge(TestLayer)));

describe('Blueprint Manager', () => {
  it.effect(
    'query-blueprints: returns all registered blueprints',
    Effect.fnUntraced(
      function* (_) {
        const result = yield* FunctionInvocationService.invokeFunction(QueryBlueprints, {});
        expect(result).toHaveLength(3);
        const keys = result.map((blueprint: Blueprint.Blueprint) => blueprint.key);
        expect(keys).toContain('org.dxos.blueprint.database');
        expect(keys).toContain('org.dxos.blueprint.markdown');
        expect(keys).toContain('org.dxos.blueprint.research');
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
        const { enabled, rejected } = yield* FunctionInvocationService.invokeFunction(EnableBlueprints, {
          keys: ['org.dxos.blueprint.database'],
        });
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
        const { enabled, rejected } = yield* FunctionInvocationService.invokeFunction(EnableBlueprints, {
          keys: ['org.dxos.blueprint.research'],
        });
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.blueprint.research');

        const { binder } = yield* AiContextService;
        const bound = binder.getBlueprints();
        expect(bound.some((bp: Blueprint.Blueprint) => bp.key === 'org.dxos.blueprint.research')).toBe(false);
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
        const { enabled, rejected } = yield* FunctionInvocationService.invokeFunction(EnableBlueprints, {
          keys: ['org.dxos.blueprint.database', 'org.dxos.blueprint.markdown', 'org.dxos.blueprint.research'],
        });
        expect(enabled).toHaveLength(2);
        const enabledKeys = enabled.map((bp: Blueprint.Blueprint) => bp.key);
        expect(enabledKeys).toContain('org.dxos.blueprint.database');
        expect(enabledKeys).toContain('org.dxos.blueprint.markdown');
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.blueprint.research');
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
        const { enabled, rejected } = yield* FunctionInvocationService.invokeFunction(EnableBlueprints, {
          keys: ['org.dxos.blueprint.nonexistent'],
        });
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
        Obj.change(stored, (mutable) => {
          mutable.name = '___TEST_MUTATED_BLUEPRINT_NAME___';
        });
        yield* Database.flush();
        expect(stored.name).toBe('___TEST_MUTATED_BLUEPRINT_NAME___');

        const conversation = yield* AiConversationService;
        yield* Effect.promise(() => conversation.context.open());
        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(BlueprintManagerDefinition.make())],
          }),
        );

        yield* conversation.createRequest({
          system: trim`
            You can call blueprint manager tools. When asked to refresh or sync blueprints from the registry,
            call the refresh blueprints tool once and then stop.
          `,
          prompt: trim`
            Refresh blueprints from the registry so database copies match the built-in definitions.
          `,
        });

        expect(stored.name).toBe(originalName);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 60_000,
  );
});
