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
import { AccessToken } from '@dxos/link';
import { Text } from '@dxos/schema';

import { AgentOperationHandlerSet } from '#operations';
import { AgentOperation, DiscordBinding, Mode } from '#types';

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
    AccessToken.AccessToken,
    DiscordBinding.DiscordBinding,
    Mode.Mode,
  ],
  disableLlmMemoization: true,
});

describe('EnsureThreadChat', () => {
  it.effect(
    'returns the same chat for the same thread and a new chat for another thread',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, {
          name: 'Concierge',
          instructions: 'Greet people.',
        });
        const agent = yield* Database.load(agentRef);
        const primary = yield* Agent.loadChat(agent);
        yield* Database.flush();

        const first = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: agentRef,
          threadId: 'thread-1',
          title: 'Hello',
          channelId: 'channel-1',
        });
        yield* Database.flush();
        const again = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: agentRef,
          threadId: 'thread-1',
        });
        const other = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: agentRef,
          threadId: 'thread-2',
        });

        const chat = yield* Database.load(first.chat);
        expect(again.chat.uri).toBe(first.chat.uri);
        expect(again.feed.uri).toBe(first.feed.uri);
        expect(other.chat.uri).not.toBe(first.chat.uri);
        expect(other.feed.uri).not.toBe(first.feed.uri);
        expect(primary?.id).toBeDefined();
        expect(chat.id).not.toBe(primary?.id);

        expect(chat.name).toBe('Hello');
        expect(Obj.getParent(chat)?.id).toBe(agent.id);
        expect(chat.instructions?.uri).toBe(agent.instructions.uri);
        expect(chat.feed.uri).toBe(first.feed.uri);
        expect(Obj.getMeta(chat).keys).toEqual([
          { source: DiscordBinding.DISCORD_SOURCE, id: 'thread-1' },
          { source: DiscordBinding.DISCORD_CHANNEL_SOURCE, id: 'channel-1' },
        ]);

        // A DM channel is keyed by its own source, so it never collides with a thread of the same id.
        const dm = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: agentRef,
          threadId: 'thread-1',
          source: 'discord.com/dm',
        });
        yield* Database.flush();
        const dmAgain = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: agentRef,
          threadId: 'thread-1',
          source: 'discord.com/dm',
        });
        expect(dm.chat.uri).not.toBe(first.chat.uri);
        expect(dmAgain.chat.uri).toBe(dm.chat.uri);
        expect(Obj.getMeta(yield* Database.load(dm.chat)).keys).toEqual([
          { source: DiscordBinding.DISCORD_DM_SOURCE, id: 'thread-1' },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'keeps threads separate per agent',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: first } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'First' });
        const { agent: second } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Second' });
        yield* Database.flush();

        const left = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: first,
          threadId: 'shared',
        });
        const right = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: second,
          threadId: 'shared',
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

describe('DiscordBinding', () => {
  it.effect(
    'is parented to its agent and found from it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Bot' });
        const agent = yield* Database.load(agentRef);
        const token = yield* Database.add(AccessToken.make({ source: 'discord.com', token: 'secret' }));
        const binding = yield* Database.add(
          DiscordBinding.make({ agent, accessToken: Ref.make(token), applicationId: 'app', channels: ['c1'] }),
        );
        yield* Database.flush();

        expect(Obj.getParent(binding)?.id).toBe(agent.id);
        const found = yield* DiscordBinding.loadForAgent(agent);
        expect(found?.id).toBe(binding.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
