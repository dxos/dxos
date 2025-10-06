//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { AiService, MemoizedAiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  FunctionInvocationService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { ObjectId, PublicKey } from '@dxos/keys';
import { DataType } from '@dxos/schema';

import { testToolkit } from '../../blueprints/testing';
import { ResearchGraph } from '../research';

import { default as entityExtraction } from './entity-extraction';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], testToolkit),
  makeToolExecutionServiceFromFunctions(testToolkit, testToolkit.toLayer({}) as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(FunctionInvocationService.layerTest({ functions: [entityExtraction] })),
  Layer.provideMerge(
    Layer.mergeAll(
      MemoizedAiService.layerTest().pipe(Layer.provide(AiServiceTestingPreset('direct'))),
      TestDatabaseLayer({
        // TODO(dmaretskyi): define the constant space key in the test-builder.
        spaceKey: PublicKey.from('665c420e0dec9aa36c2bedca567afb0778701920e346eaf83ab2bd3403859723'),
        indexing: { vector: true },
        types: [Blueprint.Blueprint, DataType.Message, DataType.Person, DataType.Organization, ResearchGraph],
      }),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
);

describe('Entity-extraction', () => {
  it.effect(
    'call a function to generate a research report',
    Effect.fnUntraced(
      function* (_) {
        const email = yield* DatabaseService.add(
          Obj.make(DataType.Message, {
            created: new Date('2025-01-01').toISOString(),
            sender: {
              name: 'John Smith',
              email: 'john.smith@anthropic.com',
            },
            blocks: [
              {
                _tag: 'text',
                text: "Hey team, what's up?",
              },
              {
                _tag: 'text',
                text: "I'm working on a new algorithm today.",
              },
              {
                _tag: 'text',
                text: 'Anything new from the research team?',
              },
            ],
          }),
        );
        yield* DatabaseService.flush({ indexes: true });
        const result = yield* FunctionInvocationService.invokeFunction(entityExtraction, {
          source: email,
        });
        expect(result.entities).toHaveLength(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined,
  );
});
