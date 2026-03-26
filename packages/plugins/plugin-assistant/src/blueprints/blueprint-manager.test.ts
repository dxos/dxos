//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiContextService, AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import {
  BlueprintManagerBlueprint,
  BlueprintManagerHandlers,
  DatabaseBlueprint,
  EnableBlueprints,
  MarkdownBlueprint,
  MarkdownHandlers,
  QueryBlueprints,
  ResearchBlueprint,
} from '@dxos/assistant-toolkit';
import { addBlueprints } from '@dxos/assistant-toolkit/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { OperationHandlerSet } from '@dxos/operation';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: OperationHandlerSet.merge(BlueprintManagerHandlers, MarkdownHandlers),
  types: [Blueprint.Blueprint, Markdown.Document],
  blueprints: [
    BlueprintManagerBlueprint.make(),
    DatabaseBlueprint.make(),
    MarkdownBlueprint.make(),
    ResearchBlueprint.make(),
  ],
  tracing: 'pretty',
});

const provideTestLayers = Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer)));

// TODO(dmaretskyi): Move this file to where blueprint is defined.
describe('Blueprint Manager (Composer integration)', () => {
  it.effect(
    'query-blueprints: lists blueprints from registry',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([BlueprintManagerBlueprint]);
        const result = yield* FunctionInvocationService.invokeFunction(QueryBlueprints, {});
        expect(result.length).toBeGreaterThanOrEqual(3);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'enable-blueprints: enables allowed blueprints and binds to context',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([BlueprintManagerBlueprint]);
        const { enabled, rejected } = yield* FunctionInvocationService.invokeFunction(EnableBlueprints, {
          keys: ['org.dxos.blueprint.database', 'org.dxos.blueprint.markdown'],
        });
        expect(enabled).toHaveLength(2);
        expect(rejected).toHaveLength(0);

        const { binder } = yield* AiContextService;
        const bound = binder.getBlueprints();
        expect(bound.some((bp: Blueprint.Blueprint) => bp.key === 'org.dxos.blueprint.database')).toBe(true);
        expect(bound.some((bp: Blueprint.Blueprint) => bp.key === 'org.dxos.blueprint.markdown')).toBe(true);
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
        yield* addBlueprints([BlueprintManagerBlueprint]);
        const { enabled, rejected } = yield* FunctionInvocationService.invokeFunction(EnableBlueprints, {
          keys: ['org.dxos.blueprint.research'],
        });
        expect(enabled).toHaveLength(0);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].key).toBe('org.dxos.blueprint.research');
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.scoped(
    'enable and use Markdown blueprint in one prompt',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([BlueprintManagerBlueprint]);
        yield* AiConversationService.run({
          prompt:
            'Enable the Markdown blueprint and then create a markdown document called "Cookie Recipe" with a simple chocolate chip cookie recipe.',
        });

        const docs = yield* Database.runQuery(Query.type(Markdown.Document));
        expect(docs.length).toBeGreaterThanOrEqual(1);
        const recipe = docs.find((doc) => doc.name?.toLowerCase().includes('cookie'));
        expect(recipe).toBeDefined();
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 240_000 },
  );
});
