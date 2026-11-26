//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import { TrajectoryStore } from '@dxos/assistant';
import * as Agent from '@dxos/compute/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId, URI } from '@dxos/keys';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import * as ThreadOperationHandlerSet from '@dxos/plugin-thread/ThreadOperationHandlerSet';
import { Text } from '@dxos/schema';
import { Channel, Message, Organization, Person, Task, TaskSet } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { BrainSkill, ConversationSkill, GoalsSkill, InterviewSkill, ModesSkill, RelaySkill } from '#skills';
import { AgentChannels, AgentOperation, ChatParticipant, MemoryOperation, Mode, Relay, RelayOperation } from '#types';

import { makeTestBrain, testSpaceLayer } from '../brain/testing.ts';
import { ensureChannelChat } from './ensure-channel-chat.ts';
import {
  TEST_HANDLE_LABEL,
  TEST_OPERATION_BACKEND_KIND,
  TEST_PENDING_DM_BACKEND_KIND,
  makeBackendOperationHandlers,
  makeChannelCapabilities,
  makeTestChannel,
  makeTestChannelBackend,
} from './testing.ts';

EntityId.dangerouslyDisableRandomness();

/** Handle the test backend refuses to DM, standing in for a Discord user with closed DMs. */
const CLOSED_DMS = '300';

const backend = makeTestChannelBackend({ refuse: [CLOSED_DMS] });
const pendingDirect = makeTestChannelBackend({ pendingDirect: true });
// Visible to plugin-thread only through its operations, as plugin-discord's backend is on EDGE.
const operationOnly = makeTestChannelBackend({ pendingDirect: true, kind: TEST_OPERATION_BACKEND_KIND });

// Deliveries into a Composer chat wake it; this suite checks where they go, not the turn that follows.
const brain = makeTestBrain({ wake: 'record' });

// One memory stands in for each test's space, so every test starts with an empty one.
afterEach(() => brain.reset());

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.merge(
    AgentOperationHandlerSet,
    ThreadOperationHandlerSet.handlers,
    makeBackendOperationHandlers(operationOnly.provider),
  ),
  // plugin-thread's channel operations resolve the backend from the capability registry.
  extraServices: Layer.mergeAll(
    testSpaceLayer,
    Layer.succeed(Capability.Service, makeChannelCapabilities(backend.provider, pendingDirect.provider)),
    brain.layer,
  ),
  types: [
    Agent.Agent,
    Agent.Session,
    Skill.Skill,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
    Person.Person,
    Organization.Organization,
    Task.Task,
    TaskSet.TaskSet,
    Message.Message,
    Channel.Channel,
    AgentChannels.AgentChannels,
    Relay.Relay,
    Mode.Mode,
  ],
  skills: [ConversationSkill.make(), InterviewSkill.make(), RelaySkill.make(), ModesSkill.make(), GoalsSkill.make()],
  disableLlmMemoization: true,
});

/** An agent that converses in one channel on the test backend. */
const setupAgent = Effect.fnUntraced(function* (options: { channels?: boolean; kind?: string } = {}) {
  const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Concierge' });
  const agent = yield* Database.load(agentRef);
  const channel = yield* Database.add(makeTestChannel('general', options.kind));
  if (options.channels !== false) {
    yield* Database.add(AgentChannels.make({ agent, channels: [channel] }));
  }
  yield* Database.flush();
  return { agent, agentRef, channel };
});

const resolve = (name: string, handle?: string) =>
  Operation.invoke(MemoryOperation.ResolveEntity, {
    name,
    handles: handle ? [{ label: TEST_HANDLE_LABEL, value: handle }] : undefined,
  }).pipe(Effect.map(({ entity }) => entity));

const hoursUntil = (iso: string) => (Date.parse(iso) - Date.now()) / 3_600_000;

const chatMessages = (chat: Agent.Session) =>
  Database.load(chat.feed).pipe(Effect.flatMap((feed) => TrajectoryStore.messages(feed)));

/** A channel thread's chat, named as EDGE names the conversation an agent turn runs in. */
const conversationIn = (agentRef: Ref.Ref<Agent.Agent>, channel: Channel.Channel, thread: string) =>
  Effect.gen(function* () {
    const chat = yield* ensureChannelChat({ agent: yield* Database.load(agentRef), channel, thread });
    return URI.make(`echo:///${chat.id}`);
  });

describe('Relay', () => {
  beforeEach(() => {
    backend.posts.length = 0;
    pendingDirect.posts.length = 0;
    operationOnly.posts.length = 0;
    brain.wakes.length = 0;
  });

  /** What each woken chat was asked to pass on, by chat id. */
  const woken = () => brain.wakes.map(({ chat, prompt }) => ({ chat: chat.id, prompt }));

  it.effect(
    'is delivered into the recipient chat and reported into the requester chat',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, agentRef } = yield* setupAgent();
        const rich = yield* resolve('Rich');
        const dima = yield* resolve('Dima');

        // Two Composer chats with the same agent, one per person.
        const richChat = yield* Database.add(
          Agent.makeSession({ [Obj.Parent]: agent, name: 'Rich', feed: Ref.make(yield* Database.add(Feed.make())) }),
        );
        const dimaChat = yield* Database.add(
          Agent.makeSession({ [Obj.Parent]: agent, name: 'Dima', feed: Ref.make(yield* Database.add(Feed.make())) }),
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
        expect(woken()).toEqual([
          {
            chat: dimaChat.id,
            prompt: BrainSkill.wakePrompt('Dima', 'Hi Dima, Rich asked me to tell you the demo moved to Friday.'),
          },
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
        expect(woken().at(-1)).toEqual({
          chat: richChat.id,
          prompt: BrainSkill.wakePrompt('Rich', 'Dima says Friday works.'),
        });
        expect(backend.posts).toHaveLength(0);

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
    'is delivered by a direct message through a channel and reported in the requester thread',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agentRef, channel } = yield* setupAgent();
        const rich = yield* resolve('Rich', '100');
        const josiah = yield* resolve('Josiah', '200');
        const { relay: relayRef } = yield* Operation.invoke(
          RelayOperation.CreateRelay,
          {
            agent: agentRef,
            recipient: josiah,
            requester: rich,
            message: 'Review the PR.',
          },
          { conversation: yield* conversationIn(agentRef, channel, 'thread-9') },
        );

        const delivered = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Rich asked me to ask you to review the PR.',
          relay: relayRef,
        });
        expect(delivered).toMatchObject({ delivered: true, via: 'channel' });
        expect(backend.posts).toEqual([
          { channel: channel.id, thread: 'dm-200', text: 'Rich asked me to ask you to review the PR.' },
        ]);

        // The direct chat now belongs to Josiah and records the post with the backend's receipt.
        expect(delivered.chat).toBeDefined();
        if (delivered.chat) {
          const dmChat = yield* Database.load(delivered.chat);
          expect(ChatParticipant.get(dmChat)).toBe((yield* Database.load(josiah)).id);
          expect(AgentChannels.conversationOf(dmChat)).toEqual({ channelId: channel.id, thread: 'dm-200' });
          expect((yield* chatMessages(dmChat)).map((message) => message.properties)).toEqual([
            { test: { messageId: 'post-1' } },
          ]);
        }

        // A second delivery reuses Josiah's conversation instead of opening another.
        yield* Operation.invoke(RelayOperation.SendMessage, { agent: agentRef, recipient: josiah, text: 'Thanks!' });
        expect(backend.posts.at(-1)).toEqual({ channel: channel.id, thread: 'dm-200', text: 'Thanks!' });

        const reported = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: rich,
          text: 'Josiah will review it today.',
          relay: relayRef,
        });
        expect(reported).toMatchObject({ delivered: true, via: 'channel' });
        expect(backend.posts.at(-1)).toEqual({
          channel: channel.id,
          thread: 'thread-9',
          text: 'Josiah will review it today.',
        });
        expect((yield* Database.load(relayRef)).status).toBe('reported');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'keys a direct chat by the thread the backend reports, when the first post opens the DM',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agentRef, channel } = yield* setupAgent({ kind: TEST_PENDING_DM_BACKEND_KIND });
        const josiah = yield* resolve('Josiah', '200');

        const delivered = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Hello.',
        });
        expect(delivered).toMatchObject({ delivered: true, via: 'channel' });
        expect(pendingDirect.posts).toEqual([{ channel: channel.id, thread: 'dm-200', text: 'Hello.' }]);

        // Keyed by the opened DM, where the recipient's replies arrive, not by the pending thread id.
        expect(delivered.chat).toBeDefined();
        if (delivered.chat) {
          const dmChat = yield* Database.load(delivered.chat);
          expect(AgentChannels.conversationOf(dmChat)).toEqual({ channelId: channel.id, thread: 'dm-200' });
          expect(ChatParticipant.get(dmChat)).toBe((yield* Database.load(josiah)).id);
        }

        // A second delivery posts into the opened DM through the same chat.
        const again = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Still there?',
        });
        const chatId = (ref: typeof again.chat) =>
          ref ? Database.load(ref).pipe(Effect.map(({ id }) => id)) : Effect.void;
        expect(yield* chatId(again.chat)).toBe(yield* chatId(delivered.chat));
        expect(pendingDirect.posts.at(-1)).toEqual({ channel: channel.id, thread: 'dm-200', text: 'Still there?' });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reaches a backend whose capability plugin-thread cannot see, through its own operations',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agentRef, channel } = yield* setupAgent({ kind: TEST_OPERATION_BACKEND_KIND });
        const josiah = yield* resolve('Josiah', '200');

        const delivered = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Hello.',
        });
        expect(delivered).toMatchObject({ delivered: true, via: 'channel' });
        expect(operationOnly.posts).toEqual([{ channel: channel.id, thread: 'dm-200', text: 'Hello.' }]);
        if (delivered.chat) {
          const chat = yield* Database.load(delivered.chat);
          expect(AgentChannels.conversationOf(chat)).toEqual({ channelId: channel.id, thread: 'dm-200' });
        }

        // Into a thread the backend already has, through the same operation.
        const sent = yield* Operation.invoke(ThreadOperation.SendToChannel, {
          channel: Ref.make(channel),
          thread: 'thread-9',
          text: 'In the thread.',
        });
        expect(sent).toMatchObject({ delivered: true, messageIds: ['post-2'] });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "returns the chat the backend's reported thread keys, not the pending chat it posted from",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, agentRef, channel } = yield* setupAgent({ kind: TEST_PENDING_DM_BACKEND_KIND });
        const josiah = yield* resolve('Josiah', '200');
        // A chat still keyed by a pending DM thread, as the mirror left it before its host opened the DM.
        const pending = yield* ensureChannelChat({ agent, channel, thread: 'pending-200' });
        const person = yield* Database.load(josiah);
        Obj.update(pending, (pending) => ChatParticipant.set(pending, person));

        const delivered = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Hello.',
        });
        expect(delivered).toMatchObject({ delivered: true, via: 'channel' });
        expect(pendingDirect.posts).toEqual([{ channel: channel.id, thread: 'dm-200', text: 'Hello.' }]);
        expect(delivered.chat).toBeDefined();
        if (delivered.chat) {
          const chat = yield* Database.load(delivered.chat);
          expect(chat.id).not.toBe(pending.id);
          expect(AgentChannels.conversationOf(chat)).toEqual({ channelId: channel.id, thread: 'dm-200' });
          expect(ChatParticipant.get(chat)).toBe(person.id);
        }

        const again = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Still there?',
        });
        const chatId = (ref: typeof again.chat) =>
          ref ? Database.load(ref).pipe(Effect.map(({ id }) => id)) : Effect.void;
        expect(yield* chatId(again.chat)).toBe(yield* chatId(delivered.chat));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips a conversation on a channel the agent no longer has',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, agentRef, channel } = yield* setupAgent();
        const josiah = yield* resolve('Josiah', '200');
        // A conversation on a channel since disconnected: the chat stays, but nothing posts there.
        const former = yield* Database.add(makeTestChannel('former'));
        const stale = yield* ensureChannelChat({ agent, channel: former, thread: 'thread-1' });
        const person = yield* Database.load(josiah);
        Obj.update(stale, (stale) => ChatParticipant.set(stale, person));

        const delivered = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Rich asked me to ask you to review the PR.',
        });
        expect(delivered).toMatchObject({ delivered: true, via: 'channel' });
        if (delivered.chat) {
          const chat = yield* Database.load(delivered.chat);
          expect(chat.id).not.toBe(stale.id);
          expect(AgentChannels.conversationOf(chat)).toEqual({ channelId: channel.id, thread: 'dm-200' });
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reaches a person through a direct conversation before a Composer chat they may not have open',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, agentRef, channel } = yield* setupAgent();
        const josiah = yield* resolve('Josiah', '200');
        const composerChat = yield* Database.add(
          Agent.makeSession({ [Obj.Parent]: agent, name: 'Josiah', feed: Ref.make(yield* Database.add(Feed.make())) }),
        );
        yield* Operation.invoke(RelayOperation.AssignChatParticipant, { chat: Ref.make(composerChat), person: josiah });

        const delivered = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'Rich asked me to ask you to review the PR.',
        });
        expect(delivered).toMatchObject({ delivered: true, via: 'channel' });
        expect(woken()).toEqual([]);
        if (delivered.chat) {
          const dmChat = yield* Database.load(delivered.chat);
          expect(dmChat.id).not.toBe(composerChat.id);
          expect(AgentChannels.conversationOf(dmChat)).toEqual({ channelId: channel.id, thread: 'dm-200' });
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "is not delivered when the backend refuses, with the backend's reason",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agentRef } = yield* setupAgent();
        const closed = yield* resolve('Closed', CLOSED_DMS);
        const result = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: closed,
          text: 'hi',
        });
        expect(result.delivered).toBe(false);
        expect(result.reason).toContain('direct messages are closed');
        expect(backend.posts).toHaveLength(0);
        const chats = yield* Database.query(Filter.type(Agent.Session)).run;
        expect(chats.some((chat) => AgentChannels.conversationOf(chat)?.thread === `dm-${CLOSED_DMS}`)).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'is not delivered when the agent has no channels',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agentRef } = yield* setupAgent({ channels: false });
        const josiah = yield* resolve('Josiah', '200');
        const result = yield* Operation.invoke(RelayOperation.SendMessage, {
          agent: agentRef,
          recipient: josiah,
          text: 'hi',
        });
        expect(result).toMatchObject({ delivered: false });
        expect(result.reason).toContain('no channels');
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
        expect(result.reason).toContain('no known handle');

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
