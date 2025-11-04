//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, MemoizedAiService } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
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
import { ObjectId } from '@dxos/keys';
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
      TestAiService(),
      TestDatabaseLayer({
        spaceKey: 'fixed',
        indexing: { vector: true },
        types: [
          Blueprint.Blueprint,
          DataType.Message.Message,
          DataType.Person.Person,
          DataType.Organization.Organization,
          ResearchGraph,
        ],
      }),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
);

describe('Entity extraction', () => {
  it.effect(
    'call a function to generate a research report',
    Effect.fnUntraced(
      function* (_) {
        const email = yield* DatabaseService.add(
          Obj.make(DataType.Message.Message, {
            [Obj.Meta]: {
              tags: ['important'],
            },
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
        for (const entity of result.entities ?? []) {
          expect(Obj.getMeta(entity)?.tags).toContain('important');
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined,
  );
});
