//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService, GenericToolkit } from '@dxos/ai';
import { ContextBinding, ToolExecutionServices } from '@dxos/assistant';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService, FunctionInvocationService, QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { ObjectId } from '@dxos/keys';
import { OperationHandlerSet } from '@dxos/operation';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import * as Chat from '../../types/Chat';

import { AgentPrompt } from './definitions';
import defaultAgentPrompt from './prompt';

ObjectId.dangerouslyDisableRandomness();

/**
 * Deterministic LM so chat-mode agent tests do not depend on memoized conversations or API keys.
 */
const StubLanguageModelLayer = Layer.effect(
  LanguageModel.LanguageModel,
  LanguageModel.make({
    generateText: () => Effect.dieMessage('Agent prompt tests use streamText only.'),
    streamText: () =>
      Stream.fromIterable([
        {
          type: 'response-metadata',
          id: 'stub-msg',
          modelId: 'stub',
          timestamp: '1970-01-01T00:00:00.000Z',
          metadata: {},
        },
        { type: 'text-start', id: '0', metadata: {} },
        { type: 'text-delta', id: '0', delta: 'ack', metadata: {} },
        { type: 'text-end', id: '0', metadata: {} },
        {
          type: 'finish',
          reason: 'stop',
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          metadata: {},
        },
      ]),
  }),
);

const StubAiServiceLayer = Layer.succeed(AiService.AiService, {
  metadata: { name: 'stub-ai' },
  model: () => StubLanguageModelLayer,
});

const testTypes = [
  Prompt.Prompt,
  Chat.Chat,
  Blueprint.Blueprint,
  Feed.Feed,
  Message.Message,
  ContextBinding,
  Text.Text,
];

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  ToolExecutionServices,
  Layer.succeed(Blueprint.RegistryService, new Blueprint.Registry([])),
).pipe(
  Layer.provideMerge(
    FunctionInvocationServiceLayerTest({
      functions: OperationHandlerSet.make(defaultAgentPrompt),
    }),
  ),
  Layer.provideMerge(
    Layer.mergeAll(
      StubAiServiceLayer,
      TestDatabaseLayer({ spaceKey: 'fixed', types: testTypes }),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
  Layer.provideMerge(GenericToolkit.providerLayer(GenericToolkit.empty)),
);

const countQueueMessages = (queue: { queryObjects: () => Promise<Obj.Unknown[]> }) =>
  Effect.promise(async () => {
    const items = await queue.queryObjects();
    return items.filter(Obj.instanceOf(Message.Message)).length;
  });

describe('Agent prompt', () => {
  it.effect(
    'chat mode appends assistant messages to the chat queue',
    Effect.fnUntraced(
      function* (_) {
        const feed = yield* Database.add(Feed.make());
        const queueDxn = Feed.getQueueDxn(feed)!;
        const queue = yield* QueueService.getQueue<Message.Message | ContextBinding>(queueDxn);
        const messageCountBefore = yield* countQueueMessages(queue);

        const chat = yield* Database.add(
          Chat.make({
            feed: Ref.make(feed),
          }),
        );

        const prompt = yield* Database.add(
          Prompt.make({
            name: 'chat-mode-test',
            instructions: 'Reply with a single word: ack.',
            blueprints: [],
            context: [],
          }),
        );

        yield* Database.flush();

        const result = yield* FunctionInvocationService.invokeFunction(AgentPrompt, {
          prompt: Ref.make(prompt),
          input: {},
          chat: Ref.make(chat),
        });

        const messageCountAfter = yield* countQueueMessages(queue);

        expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
        expect(result.note).toBe('ack');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
