//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { ContentBlock, Message } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { ConversationSkill } from '#skills';
import { AgentChannels, EmailOperation, MemoryOperation } from '#types';

import { REMINDER } from './ensure-reply-sent.ts';

EntityId.dangerouslyDisableRandomness();

const manager = CapabilityManager.make({ registry: AtomRegistry.make() });
manager.contribute({
  module: 'test',
  interface: Capabilities.OperationHandler,
  implementation: AgentOperationHandlerSet,
});

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [Chat.Chat, Feed.Feed, Message.Message],
  extraServices: Layer.succeed(Capability.Service, manager),
  disableLlmMemoization: true,
});

describe('EnsureReplySent', () => {
  it.effect(
    'asks a channel conversation to send the text it wrote',
    Effect.fnUntraced(
      function* ({ expect }) {
        const conversation = yield* setupChat({
          channel: true,
          messages: [
            prompt('I work on the inbox.'),
            ...call(MemoryOperation.Remember, 'remember'),
            reply('Nice, good to know.'),
          ],
        });
        const output = yield* Operation.invoke(ConversationSkill.EnsureReplySent, {}).pipe(
          Effect.provide(conversation),
        );

        expect(output).toEqual({ followUp: REMINDER });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'is silent once a channel send succeeded',
    Effect.fnUntraced(
      function* ({ expect }) {
        const conversation = yield* setupChat({
          channel: true,
          messages: [prompt('Hi'), ...call(EmailOperation.Send, 'send'), reply('Replied by email.')],
        });
        const output = yield* Operation.invoke(ConversationSkill.EnsureReplySent, {}).pipe(
          Effect.provide(conversation),
        );

        expect(output).toEqual({});
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'is silent in a Composer chat, where the text is the reply',
    Effect.fnUntraced(
      function* ({ expect }) {
        const conversation = yield* setupChat({ channel: false, messages: [prompt('Hi'), reply('Nice to meet you.')] });
        const output = yield* Operation.invoke(ConversationSkill.EnsureReplySent, {}).pipe(
          Effect.provide(conversation),
        );

        expect(output).toEqual({});
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reminds once per request',
    Effect.fnUntraced(
      function* ({ expect }) {
        const conversation = yield* setupChat({
          channel: true,
          messages: [prompt('Hi'), reply('Nice to meet you.'), followUp(REMINDER), reply('Nice to meet you.')],
        });
        const output = yield* Operation.invoke(ConversationSkill.EnsureReplySent, {}).pipe(
          Effect.provide(conversation),
        );

        expect(output).toEqual({});
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

/** A chat whose feed holds `messages`; with `channel` it mirrors a channel conversation. */
const setupChat = Effect.fnUntraced(function* ({
  channel,
  messages,
}: {
  channel: boolean;
  messages: Message.Message[];
}) {
  const feed = yield* Database.add(Feed.make());
  yield* Database.add(
    Chat.make({
      ...(channel ? { [Obj.Meta]: { keys: [AgentChannels.chatKey('channel', 'thread')] } } : {}),
      feed: Ref.make(feed),
    }),
  );
  yield* Feed.append(feed, messages);
  yield* Database.flush();
  return Operation.withInvocationOptions({ conversation: Obj.getURI(feed) });
});

const prompt = (text: string) => Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text }] });

const followUp = (text: string) =>
  Message.make({ sender: { role: 'user' }, blocks: [ContentBlock.Text.make({ text, disposition: 'synthetic' })] });

const reply = (text: string) => Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text }] });

/** A tool call the agent made to `operation`, and its successful result. */
const call = (operation: Operation.Definition.Any, toolCallId: string) => {
  const name = Operation.toolName(operation);
  return [
    Message.make({
      sender: { role: 'assistant' },
      blocks: [
        {
          _tag: 'toolCall',
          toolCallId,
          name,
          input: '{}',
          providerExecuted: false,
          operationKey: operation.meta.key,
        },
      ],
    }),
    Message.make({
      sender: { role: 'tool' },
      blocks: [{ _tag: 'toolResult', toolCallId, name, result: '{}', providerExecuted: false }],
    }),
  ];
};
