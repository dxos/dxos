//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ContextBinding } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Routine } from '@dxos/compute';
import { QueueService } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { OperationHandlerSet } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import * as Chat from '../../types/Chat';
import { AgentPrompt } from './definitions';
import defaultAgentPrompt from './prompt';

ObjectId.dangerouslyDisableRandomness();

const operationHandlerSet = OperationHandlerSet.make(defaultAgentPrompt);

const TestLayer = AssistantTestLayer({
  operationHandlers: operationHandlerSet,
  types: [Chat.Chat, Message.Message, ContextBinding, Text.Text],
  aiServicePreset: 'edge-remote',
});

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
          Routine.make({
            name: 'chat-mode-test',
            instructions: 'Reply with a single word: ack.',
            blueprints: [],
            context: [],
          }),
        );

        yield* Database.flush();

        const result = yield* Operation.invoke(AgentPrompt, {
          prompt: Ref.make(prompt),
          input: {},
          chat: Ref.make(chat),
        });

        const messageCountAfter = yield* countQueueMessages(queue);

        expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
        expect(result).toBe('ack');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
