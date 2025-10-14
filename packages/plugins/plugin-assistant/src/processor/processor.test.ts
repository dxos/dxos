//
// Copyright 2025 DXOS.org
//

import { Tool, Toolkit } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { AiConversation, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  FunctionInvocationService,
  QueueService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { type DataType } from '@dxos/schema';

import { AiChatProcessor, type AiChatServices } from './processor';

class TestToolkit extends Toolkit.make(
  Tool.make('random', {
    description: 'Random number generator',
    parameters: {},
    success: Schema.Number,
  }),
) {}

// TODO(burdon): Create minimal toolkit.
const toolkit = Toolkit.merge(TestToolkit) as Toolkit.Toolkit<any>;

// TODO(burdon): Explain structure.
const TestServicesLayer = Layer.mergeAll(
  TracingService.layerNoop,
  AiServiceTestingPreset('direct'),
  TestDatabaseLayer({
    // indexing: { vector: true },
    // types: [],
  }),
  // CredentialsService.configuredLayer([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
  FunctionInvocationService.layerTestMocked({ functions: [] }).pipe(
    Layer.provideMerge(ComputeEventLogger.layerFromTracing),
    Layer.provideMerge(TracingService.layerNoop),
  ),
);

const TestLayer: Layer.Layer<AiChatServices, never, never> = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], toolkit),
  makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
  CredentialsService.layerFromDatabase(),
  ComputeEventLogger.layerFromTracing,
).pipe(Layer.provideMerge(TestServicesLayer), Layer.orDie);

// TODO(burdon): Create actual test with mock LLM.
describe('Chat processor', () => {
  it.effect(
    'basic',
    Effect.fn(
      function* ({ expect }) {
        const services = yield* Effect.runtime<AiChatServices>();
        const queue = yield* QueueService.createQueue<DataType.Message>();
        const conversation = new AiConversation({ queue });
        const processor = new AiChatProcessor(conversation, async () => services);
        const result = yield* Effect.promise(() => processor.request({ message: 'Hello' }));
        void processor.cancel();
        expect(processor.active).to.be.false;
        expect(result).to.exist;
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
