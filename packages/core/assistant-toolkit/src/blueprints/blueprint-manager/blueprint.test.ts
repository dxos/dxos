//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiContextService, AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';

import { BlueprintManagerHandlers, QueryBlueprints, EnableBlueprints } from './functions';
import DatabaseBlueprint from '../database/blueprint';
import MarkdownBlueprint from '../markdown/blueprint';
import ResearchBlueprint from '../research/blueprint';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: BlueprintManagerHandlers,
  types: [Blueprint.Blueprint],
  blueprints: [DatabaseBlueprint.make(), MarkdownBlueprint.make(), ResearchBlueprint.make()],
  tracing: 'pretty',
});

const provideTestLayers = Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer)));

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
});
