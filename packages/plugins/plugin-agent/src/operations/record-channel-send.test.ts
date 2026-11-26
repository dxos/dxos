//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { TrajectoryStore } from '@dxos/assistant';
import * as Agent from '@dxos/compute/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Channel } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { AgentChannels, AgentEmail, AgentOperation, Mode } from '#types';

import { makeTestChannel } from './testing.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: AgentOperationHandlerSet,
  types: [
    Agent.Agent,
    Agent.Session,
    Skill.Skill,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
    Channel.Channel,
    AgentChannels.AgentChannels,
    AgentEmail.AgentEmail,
    Mode.Mode,
  ],
  disableLlmMemoization: true,
});

describe('RecordChannelSend', () => {
  it.effect(
    "records what the agent sent in the conversation's chat, created on first contact and reused after",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, {
          name: 'Concierge',
          instructions: 'Greet people.',
        });
        const channel = yield* Database.add(makeTestChannel());
        const channelRef = Ref.make(channel);
        yield* Database.flush();

        const receipt = { discord: { channelId: 'dm-1', messageId: 'm-1' } };
        const first = yield* Operation.invoke(AgentOperation.RecordChannelSend, {
          agent: agentRef,
          channel: channelRef,
          thread: 'dm-1',
          text: 'Which day is the demo?',
          properties: receipt,
        });
        yield* Database.flush();
        const second = yield* Operation.invoke(AgentOperation.RecordChannelSend, {
          agent: agentRef,
          channel: channelRef,
          thread: 'dm-1',
          text: 'Also, which venue?',
        });
        // The same chat EnsureChannelChat answers for the conversation, so the person's answer lands beside it.
        const ensured = yield* Operation.invoke(AgentOperation.EnsureChannelChat, {
          agent: agentRef,
          channel: channelRef,
          thread: 'dm-1',
        });
        expect(second.chat.uri).toBe(first.chat.uri);
        expect(ensured.chat.uri).toBe(first.chat.uri);

        const chat = yield* Database.load(first.chat);
        const messages = yield* TrajectoryStore.messages(yield* Database.load(chat.feed));
        expect(messages.map((message) => [message.sender.role, message.blocks[0]])).toEqual([
          ['assistant', { _tag: 'text', text: 'Which day is the demo?' }],
          ['assistant', { _tag: 'text', text: 'Also, which venue?' }],
        ]);
        expect(messages[0].properties).toMatchObject(receipt);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
