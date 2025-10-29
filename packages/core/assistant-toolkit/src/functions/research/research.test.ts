//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter, MemoizedAiService } from '@dxos/ai';
import { AiServiceTestingPreset, EXA_API_KEY } from '@dxos/ai/testing';
import {
  AiConversation,
  type ContextBinding,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref, Type } from '@dxos/echo';
import { TestHelpers, acquireReleaseResource } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  FunctionInvocationService,
  QueueService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { ObjectId, PublicKey } from '@dxos/keys';
import { DataType } from '@dxos/schema';

import { ResearchBlueprint } from '../../blueprints';
import { testToolkit } from '../../blueprints/testing';

import createDocument from './create-document';
import { createExtractionSchema, getSanitizedSchemaName } from './graph';
import { default as research } from './research';
import { ResearchGraph, queryResearchGraph } from './research-graph';
import { ResearchDataTypes } from './types';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([research, createDocument], testToolkit),
  makeToolExecutionServiceFromFunctions(testToolkit, testToolkit.toLayer({}) as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(FunctionInvocationService.layerTest({ functions: [research, createDocument] })),
  Layer.provideMerge(
    Layer.mergeAll(
      MemoizedAiService.layerTest().pipe(Layer.provide(AiServiceTestingPreset('direct'))),
      // AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        // TODO(dmaretskyi): define the constant space key in the test-builder.
        spaceKey: PublicKey.from('665c420e0dec9aa36c2bedca567afb0778701920e346eaf83ab2bd3403859723'),
        indexing: { vector: true },
        types: [...ResearchDataTypes, ResearchGraph, Blueprint.Blueprint],
      }),
      CredentialsService.configuredLayer([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
      TracingService.layerNoop,
    ),
  ),
);

describe('Research', () => {
  it.effect(
    'call a function to generate a research report',
    Effect.fnUntraced(
      function* (_) {
        yield* DatabaseService.add(
          Obj.make(DataType.Organization, {
            name: 'Airbnb',
            website: 'https://www.airbnb.com/',
          }),
        );
        yield* DatabaseService.flush({ indexes: true });

        const result = yield* FunctionInvocationService.invokeFunction(research, {
          query: 'Founders and investors of airbnb.',
          mockSearch: false,
        });

        console.log(inspect(result, { depth: null, colors: true }));
        console.log(JSON.stringify(result, null, 2));

        yield* DatabaseService.flush({ indexes: true });
        const researchGraph = yield* queryResearchGraph();
        const data = yield* DatabaseService.load(researchGraph!.queue).pipe(
          Effect.flatMap((queue) => Effect.promise(() => queue.queryObjects())),
        );
        console.log(inspect(data, { depth: null, colors: true }));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : undefined,
  );

  it.scoped(
    'research blueprint',
    Effect.fnUntraced(
      function* (_) {
        const queue = yield* QueueService.createQueue<DataType.Message | ContextBinding>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation(queue));

        const org = Obj.make(DataType.Organization, { name: 'Airbnb', website: 'https://www.airbnb.com/' });
        yield* DatabaseService.add(org);
        yield* DatabaseService.flush({ indexes: true });

        const blueprint = yield* DatabaseService.add(Obj.clone(ResearchBlueprint));
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        yield* conversation.createRequest({
          observer,
          prompt: `Research airbnb founders.`,
        });

        const researchGraph = yield* queryResearchGraph();
        const data = yield* DatabaseService.load(researchGraph!.queue).pipe(
          Effect.flatMap((queue) => Effect.promise(() => queue.queryObjects())),
        );
        console.log(inspect(data, { depth: null, colors: true }));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : undefined,
  );
});
