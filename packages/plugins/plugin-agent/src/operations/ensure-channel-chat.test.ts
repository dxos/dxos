//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Channel } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { AgentChannels, AgentOperation, Mode } from '#types';

import { makeTestChannel } from './testing.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [
    Agent.Agent,
    Chat.Chat,
    Skill.Skill,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
    Channel.Channel,
    AgentChannels.AgentChannels,
    Mode.Mode,
  ],
  disableLlmMemoization: true,
});

describe('EnsureChannelChat', () => {
  it.effect(
    'returns the same chat for the same conversation and a new chat for another',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, {
          name: 'Concierge',
          instructions: 'Greet people.',
        });
        const agent = yield* Database.load(agentRef);
        const primary = yield* Agent.loadChat(agent);
        const channel = yield* Database.add(makeTestChannel());
        const channelRef = Ref.make(channel);
        yield* Database.flush();

        const first = yield* Operation.invoke(AgentOperation.EnsureChannelChat, {
          agent: agentRef,
          channel: channelRef,
          thread: 'thread-1',
          title: 'Hello',
        });
        yield* Database.flush();
        const again = yield* Operation.invoke(AgentOperation.EnsureChannelChat, {
          agent: agentRef,
          channel: channelRef,
          thread: 'thread-1',
        });
        const other = yield* Operation.invoke(AgentOperation.EnsureChannelChat, {
          agent: agentRef,
          channel: channelRef,
          thread: 'thread-2',
        });
        // The channel itself (no thread) is a conversation of its own.
        const whole = yield* Operation.invoke(AgentOperation.EnsureChannelChat, {
          agent: agentRef,
          channel: channelRef,
        });

        const chat = yield* Database.load(first.chat);
        expect(again.chat.uri).toBe(first.chat.uri);
        expect(again.feed.uri).toBe(first.feed.uri);
        expect(other.chat.uri).not.toBe(first.chat.uri);
        expect(other.feed.uri).not.toBe(first.feed.uri);
        expect(whole.chat.uri).not.toBe(first.chat.uri);
        expect(primary?.id).toBeDefined();
        expect(chat.id).not.toBe(primary?.id);

        expect(chat.name).toBe('Hello');
        expect(Obj.getParent(chat)?.id).toBe(agent.id);
        expect(chat.instructions?.uri).toBe(agent.instructions.uri);
        expect(Obj.getMeta(chat).keys).toEqual([AgentChannels.chatKey(channel.id, 'thread-1')]);
        expect(AgentChannels.conversationOf(chat)).toEqual({ channelId: channel.id, thread: 'thread-1' });
        expect(AgentChannels.conversationOf(yield* Database.load(whole.chat))).toEqual({ channelId: channel.id });

        // A bridged chat never shadows the agent's primary chat.
        expect((yield* Agent.loadChat(agent))?.id).toBe(primary?.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'keeps conversations separate per agent',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: first } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'First' });
        const { agent: second } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Second' });
        const channel = Ref.make(yield* Database.add(makeTestChannel()));
        yield* Database.flush();

        const left = yield* Operation.invoke(AgentOperation.EnsureChannelChat, {
          agent: first,
          channel,
          thread: 'shared',
        });
        const right = yield* Operation.invoke(AgentOperation.EnsureChannelChat, {
          agent: second,
          channel,
          thread: 'shared',
        });
        expect(right.chat.uri).not.toBe(left.chat.uri);

        const { agents } = yield* Operation.invoke(AgentOperation.ListAgents, {});
        expect(agents.map(({ name, chats }) => ({ name, chats }))).toEqual(
          expect.arrayContaining([
            { name: 'First', chats: 2 },
            { name: 'Second', chats: 2 },
          ]),
        );
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

describe('AgentChannels', () => {
  it.effect(
    'is parented to its agent and resolves its channels',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Bot' });
        const agent = yield* Database.load(agentRef);
        const channel = yield* Database.add(makeTestChannel());
        const list = yield* Database.add(AgentChannels.make({ agent, channels: [channel] }));
        yield* Database.flush();

        expect(Obj.getParent(list)?.id).toBe(agent.id);
        expect((yield* AgentChannels.loadForAgent(agent))?.id).toBe(list.id);
        expect((yield* AgentChannels.loadChannels(agent)).map(({ id }) => id)).toEqual([channel.id]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
