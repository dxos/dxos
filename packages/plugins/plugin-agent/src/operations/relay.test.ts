//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import * as ThreadOperationHandlerSet from '@dxos/plugin-thread/ThreadOperationHandlerSet';
import { Text } from '@dxos/schema';
import { Channel, Message, Organization, Person, Task, TaskSet } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { BrainSkill, ConversationSkill, GoalsSkill, InterviewSkill, ModesSkill, RelaySkill } from '#skills';
import { AgentChannels, AgentOperation, ChatParticipant, MemoryOperation, Mode, Relay, RelayOperation } from '#types';

import { makeTestBrain, testSpaceLayer } from '../brain/testing.ts';
import { TEST_HANDLE_LABEL, makeChannelCapabilities, makeTestChannel, makeTestChannelBackend } from './testing.ts';

EntityId.dangerouslyDisableRandomness();

/** Handle the test backend refuses to DM, standing in for a Discord user with closed DMs. */
const CLOSED_DMS = '300';

const backend = makeTestChannelBackend({ refuse: [CLOSED_DMS] });

// Deliveries into a Composer chat wake it; this suite checks where they go, not the turn that follows.
const brain = makeTestBrain({ wake: 'record' });

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.merge(AgentOperationHandlerSet, ThreadOperationHandlerSet.handlers),
  // plugin-thread's channel operations resolve the backend from the capability registry.
  extraServices: Layer.mergeAll(
    testSpaceLayer,
    Layer.succeed(Capability.Service, makeChannelCapabilities(backend.provider)),
    brain.layer,
  ),
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
    Channel.Channel,
    AgentChannels.AgentChannels,
    Relay.Relay,
    Mode.Mode,
  ],
  skills: [ConversationSkill.make(), InterviewSkill.make(), RelaySkill.make(), ModesSkill.make(), GoalsSkill.make()],
  disableLlmMemoization: true,
});

/** An agent that converses in one channel on the test backend. */
const setupAgent = Effect.fnUntraced(function* (options: { channels?: boolean } = {}) {
  const { agent: agentRef } = yield* Operation.invoke(AgentOperation.CreateAgent, { name: 'Concierge' });
  const agent = yield* Database.load(agentRef);
  const channel = yield* Database.add(makeTestChannel());
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

const chatMessages = (chat: Chat.Chat) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(chat.feed);
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    return messages.filter((message) => Obj.instanceOf(Message.Message, message));
  });

describe('Relay', () => {
  beforeEach(() => {
    backend.posts.length = 0;
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
        const { relay: relayRef } = yield* Operation.invoke(RelayOperation.CreateRelay, {
          agent: agentRef,
          recipient: josiah,
          requester: rich,
          message: 'Review the PR.',
          replyChannel: Ref.make(channel),
          replyThread: 'thread-9',
        });

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
        const chats = yield* Database.query(Filter.type(Chat.Chat)).run;
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
