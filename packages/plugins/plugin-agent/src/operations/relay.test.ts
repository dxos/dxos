//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, it, vi } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { AccessToken } from '@dxos/link';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';
import { Text } from '@dxos/schema';
import { Message, Organization, Person, Task, TaskSet } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { ConversationSkill, InterviewSkill, RelaySkill } from '#skills';
import {
  AgentOperation,
  ChatParticipant,
  DiscordBinding,
  DiscordOperation,
  MemoryOperation,
  Relay,
  RelayOperation,
} from '#types';

import { chunkText } from './discord-rest.ts';

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
    Person.Person,
    Organization.Organization,
    Task.Task,
    TaskSet.TaskSet,
    Message.Message,
    AccessToken.AccessToken,
    DiscordBinding.DiscordBinding,
    Relay.Relay,
  ],
  skills: [ConversationSkill.make(), InterviewSkill.make(), RelaySkill.make()],
  disableLlmMemoization: true,
});

type Call = { url: string; method?: string; authorization?: string; body: unknown };

/** A fake Discord REST API: answers DM-channel and message posts, or a scripted error. */
const fakeDiscord = (options: { fail?: { status: number; code?: number; message?: string } } = {}) => {
  const calls: Call[] = [];
  let next = 0;
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      method: init?.method,
      authorization: headers.get('Authorization') ?? undefined,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    if (options.fail) {
      return Response.json({ code: options.fail.code, message: options.fail.message }, { status: options.fail.status });
    }
    if (url.endsWith('/users/@me/channels')) {
      return Response.json({ id: 'dm-1', type: 1 });
    }
    return Response.json({ id: `message-${++next}` });
  });
  return { calls, fetch };
};

/** An agent bound to a bot with a pasted token. */
const setupAgent = (token = 'bot-secret') =>
  Effect.gen(function* () {
    const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Concierge' });
    const agent = yield* Database.load(agentRef);
    const accessToken = yield* Database.add(AccessToken.make({ source: 'discord.com', token }));
    const binding = yield* Database.add(
      DiscordBinding.make({ agent, accessToken: Ref.make(accessToken), applicationId: 'app' }),
    );
    yield* Database.flush();
    return { agent, agentRef, binding };
  });

const resolve = (name: string, discordId?: string) =>
  Operation.invoke(MemoryOperation.ResolveEntity, {
    name,
    handles: discordId ? [{ label: 'discord', value: discordId }] : undefined,
  }).pipe(Effect.map(({ entity }) => entity));

const hoursUntil = (iso: string) => (Date.parse(iso) - Date.now()) / 3_600_000;

const chatMessages = (chat: Chat.Chat) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(chat.feed);
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    return messages.filter((message) => Obj.instanceOf(Message.Message, message));
  });

describe('chunkText', () => {
  it('splits past the limit on a boundary and keeps short text whole', ({ expect }) => {
    expect(chunkText('hello')).toEqual(['hello']);
    const words = Array.from({ length: 50 }, (_, index) => `word${index}`).join(' ');
    const chunks = chunkText(words, 100);
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true);
    expect(chunks.join(' ')).toBe(words);
    expect(chunkText('x'.repeat(250), 100).map((chunk) => chunk.length)).toEqual([100, 100, 50]);
  });
});

describe('SendDiscordMessage', () => {
  let discord: ReturnType<typeof fakeDiscord>;
  beforeEach(() => {
    discord = fakeDiscord();
    vi.stubGlobal('fetch', discord.fetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect(
    'opens a DM, posts in chunks without mentions, and records the posts in a DM chat',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, binding } = yield* setupAgent();
        const text = `${'a'.repeat(1500)}\n${'b'.repeat(1000)}`;
        const result = yield* Operation.invoke(DiscordOperation.SendMessage, {
          binding: Ref.make(binding),
          userId: 'user-7',
          text,
        });

        expect(result).toEqual({ delivered: true, channelId: 'dm-1', messageIds: ['message-1', 'message-2'] });
        expect(discord.calls.map(({ url, method }) => ({ url, method }))).toEqual([
          { url: 'https://discord.com/api/v10/users/@me/channels', method: 'POST' },
          { url: 'https://discord.com/api/v10/channels/dm-1/messages', method: 'POST' },
          { url: 'https://discord.com/api/v10/channels/dm-1/messages', method: 'POST' },
        ]);
        expect(discord.calls[0].authorization).toBe('Bot bot-secret');
        expect(discord.calls[0].body).toEqual({ recipient_id: 'user-7' });
        expect(discord.calls[1].body).toEqual({ content: 'a'.repeat(1500), allowed_mentions: { parse: [] } });
        expect(discord.calls[2].body).toEqual({ content: 'b'.repeat(1000), allowed_mentions: { parse: [] } });

        const { chat: chatRef } = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: Ref.make(agent),
          threadId: 'dm-1',
          source: 'discord.com/dm',
        });
        const chat = yield* Database.load(chatRef);
        expect(Obj.getMeta(chat).keys).toEqual([{ source: DiscordBinding.DISCORD_DM_SOURCE, id: 'dm-1' }]);
        const messages = yield* chatMessages(chat);
        expect(messages.map((message) => message.properties)).toEqual([
          { discord: { channelId: 'dm-1', messageId: 'message-1' } },
          { discord: { channelId: 'dm-1', messageId: 'message-2' } },
        ]);
        expect(messages.every((message) => message.sender.role === 'assistant')).toBe(true);

        // A DM chat never shadows the agent's primary chat, nor a guild thread with the same id.
        expect((yield* Agent.loadChat(agent))?.id).not.toBe(chat.id);
        const { chat: threadRef } = yield* Operation.invoke(AgentOperation.EnsureThreadChat, {
          agent: Ref.make(agent),
          threadId: 'dm-1',
        });
        expect(threadRef.uri).not.toBe(chatRef.uri);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reports a closed DM (50007) as undelivered and records nothing',
    Effect.fnUntraced(
      function* ({ expect }) {
        discord = fakeDiscord({ fail: { status: 403, code: 50007, message: 'Cannot send messages to this user' } });
        vi.stubGlobal('fetch', discord.fetch);
        const { binding } = yield* setupAgent();
        const result = yield* Operation.invoke(DiscordOperation.SendMessage, {
          binding: Ref.make(binding),
          channelId: 'channel-1',
          text: 'hi',
        });
        expect(result.delivered).toBe(false);
        expect(result.reason).toContain('DMs are closed');
        const chats = yield* Database.query(Filter.type(Chat.Chat)).run;
        expect(chats.some((chat) => Obj.getMeta(chat).keys.some(({ id }) => id === 'channel-1'))).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'declines a managed token without calling Discord',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { binding } = yield* setupAgent(MANAGED_ACCESS_TOKEN);
        const result = yield* Operation.invoke(DiscordOperation.SendMessage, {
          binding: Ref.make(binding),
          userId: 'user-7',
          text: 'hi',
        });
        expect(result.delivered).toBe(false);
        expect(result.reason).toContain('managed');
        expect(discord.calls).toHaveLength(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

describe('Relay', () => {
  let discord: ReturnType<typeof fakeDiscord>;
  beforeEach(() => {
    discord = fakeDiscord();
    vi.stubGlobal('fetch', discord.fetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect(
    'is delivered into the recipient chat and reported into the requester chat',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, agentRef } = yield* setupAgent();
        const rich = yield* resolve('Rich');
        const dima = yield* resolve('Dima');

        // Two Composer chats with the same agent, one per person.
        const richChat = yield* Database.add(
          Chat.make({ [Obj.Parent]: agent, name: 'Rich', feed: Ref.make(yield* Database.add(Feed.make())) }),
        );
        const dimaChat = yield* Database.add(
          Chat.make({ [Obj.Parent]: agent, name: 'Dima', feed: Ref.make(yield* Database.add(Feed.make())) }),
        );
        yield* Operation.invoke(RelayOperation.AssignChatParticipant, { chat: Ref.make(richChat), person: rich });
        yield* Operation.invoke(RelayOperation.AssignChatParticipant, { chat: Ref.make(dimaChat), person: dima });
        expect(ChatParticipant.get(dimaChat)).toBe((yield* Database.load(dima)).id);

        const { relay: relayRef, task: taskRef } = yield* Operation.invoke(RelayOperation.CreateRelay, {
          agent: agentRef,
          recipient: dima,
          requester: rich,
          message: 'The demo moved to Friday.',
        });
        const relay = yield* Database.load(relayRef);
        const task = yield* Database.load(taskRef);
        expect(relay.status).toBe('pending');
        expect(Obj.getParent(relay)?.id).toBe(agent.id);
        expect(task.status).toBe('todo');
        expect(task.title).toBe('Tell Dima: The demo moved to Friday.');
        expect(task.assignee?.role).toBe('assistant');
        const taskSet = yield* Database.query(Filter.type(TaskSet.TaskSet)).run;
        expect(taskSet).toHaveLength(1);
        expect(Obj.getParent(taskSet[0])?.id).toBe(agent.id);
        expect(hoursUntil(relay.dueAt)).toBeCloseTo(Relay.DEFAULT_DUE_HOURS, 0);

        const delivered = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: dima,
          text: 'Hi Dima, Rich asked me to tell you the demo moved to Friday.',
          relay: relayRef,
        });
        expect(delivered).toMatchObject({ delivered: true, via: 'chat' });
        expect(delivered.chat?.uri).toBe(Ref.make(dimaChat).uri);
        expect(relay.status).toBe('delivered');
        expect(relay.deliveredAt).toBeDefined();
        expect(task.status).toBe('started');
        expect((yield* chatMessages(dimaChat)).map(Message.extractText)).toEqual([
          'Hi Dima, Rich asked me to tell you the demo moved to Friday.',
        ]);

        const reported = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: rich,
          text: 'Dima says Friday works.',
          relay: relayRef,
        });
        expect(reported).toMatchObject({ delivered: true, via: 'chat' });
        expect(relay.status).toBe('reported');
        expect(task.status).toBe('done');
        expect((yield* chatMessages(richChat)).map(Message.extractText)).toEqual(['Dima says Friday works.']);
        expect(discord.calls).toHaveLength(0);

        const { relays } = yield* Operation.invoke(RelayOperation.ListRelays, { agent: agentRef });
        expect(relays.map(({ status, overdue, message }) => ({ status, overdue, message }))).toEqual([
          { status: 'reported', overdue: false, message: 'The demo moved to Friday.' },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'is delivered by Discord DM and reported in the requester thread',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agentRef } = yield* setupAgent();
        const rich = yield* resolve('Rich', '100');
        const josiah = yield* resolve('Josiah', '200');
        const { relay: relayRef } = yield* Operation.invoke(RelayOperation.CreateRelay, {
          agent: agentRef,
          recipient: josiah,
          requester: rich,
          message: 'Review the PR.',
          replyChannelId: 'thread-9',
        });

        const delivered = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Rich asked me to ask you to review the PR.',
          relay: relayRef,
        });
        expect(delivered).toMatchObject({ delivered: true, via: 'discord' });
        expect(discord.calls[0].body).toEqual({ recipient_id: '200' });

        // The DM chat now belongs to Josiah, so the next delivery reuses it.
        expect(delivered.chat).toBeDefined();
        if (delivered.chat) {
          const dmChat = yield* Database.load(delivered.chat);
          expect(ChatParticipant.get(dmChat)).toBe((yield* Database.load(josiah)).id);
        }

        const reported = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: rich,
          text: 'Josiah will review it today.',
          relay: relayRef,
        });
        expect(reported).toMatchObject({ delivered: true, via: 'discord' });
        expect(discord.calls.at(-1)?.url).toBe('https://discord.com/api/v10/channels/thread-9/messages');
        expect((yield* Database.load(relayRef)).status).toBe('reported');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'is not delivered when the recipient is unreachable, and fails cleanly',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agentRef } = yield* setupAgent();
        const nobody = yield* resolve('Nobody');
        const { relay: relayRef, task: taskRef } = yield* Operation.invoke(RelayOperation.CreateRelay, {
          agent: agentRef,
          recipient: nobody,
          message: 'Hello.',
          dueInHours: -1,
        });
        const result = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: nobody,
          text: 'Hello.',
          relay: relayRef,
        });
        expect(result.delivered).toBe(false);
        expect(result.reason).toContain('no known Discord user id');

        const { relays } = yield* Operation.invoke(RelayOperation.ListRelays, { agent: agentRef, status: 'pending' });
        expect(relays.map(({ overdue }) => overdue)).toEqual([true]);

        yield* Operation.invoke(RelayOperation.UpdateRelay, {
          relay: relayRef,
          status: 'failed',
          outcome: result.reason,
        });
        expect((yield* Database.load(relayRef)).outcome).toContain('Nobody');
        expect((yield* Database.load(taskRef)).status).toBe('failed');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
