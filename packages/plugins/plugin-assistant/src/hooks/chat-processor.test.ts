//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { AiConversation, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  LocalFunctionExecutionService,
  QueueService,
  RemoteFunctionExecutionService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { type DataType } from '@dxos/schema';

import { AiChatProcessor } from './chat-processor';
import { type AiChatServices } from './useChatServices';

// TODO(burdon): Minimal toolkit.
const toolkit = AiToolkit.merge() as AiToolkit.Any as AiToolkit.AiToolkit<AiTool.Any>;

const TestLayer: Layer.Layer<AiChatServices, never, never> = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], toolkit),
  makeToolExecutionServiceFromFunctions([], toolkit, toolkit.toLayer({}) as any),
  CredentialsService.layerFromDatabase(),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        // indexing: { vector: true },
        types: [],
      }),
      // CredentialsService.configuredLayer([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
      LocalFunctionExecutionService.layer,
      RemoteFunctionExecutionService.mockLayer,
      TracingService.layerNoop,
    ),
  ),
  Layer.orDie,
);

describe('Chat processor', () => {
  it.effect(
    'basic',
    Effect.fn(
      function* ({ expect }) {
        const services = TestLayer;
        const queue = yield* QueueService.createQueue<DataType.Message>();
        const conversation = new AiConversation({ queue });
        const processor = new AiChatProcessor(services, conversation);
        expect(processor).to.exist;
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
