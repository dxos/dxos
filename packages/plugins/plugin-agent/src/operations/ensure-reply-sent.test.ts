//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { ContentBlock, Message } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { ConversationSkill } from '#skills';
import { AgentChannels } from '#types';

import { REMINDER } from './ensure-reply-sent.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [Chat.Chat, Feed.Feed, Message.Message],
  disableLlmMemoization: true,
});

describe('EnsureReplySent', () => {
  it.effect(
    'asks a channel conversation to send the text it wrote',
    Effect.fnUntraced(
      function* ({ expect }) {
        const conversation = yield* setupChat({ channel: true, messages: [prompt('Hi'), reply('Nice to meet you.')] });
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
    'is silent once the reply was queued for the host or posted',
    Effect.fnUntraced(
      function* ({ expect }) {
        for (const properties of [
          { [AgentChannels.OUTBOUND_PROPERTY]: true },
          { discord: { channelId: 'thread', messageId: 'posted' } },
        ]) {
          const conversation = yield* setupChat({
            channel: true,
            messages: [prompt('Hi'), reply('Let me check.'), reply('Nice to meet you.', properties)],
          });
          const output = yield* Operation.invoke(ConversationSkill.EnsureReplySent, {}).pipe(
            Effect.provide(conversation),
          );

          expect(output).toEqual({});
        }
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

const reply = (text: string, properties?: Record<string, unknown>) =>
  Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text }], properties });
