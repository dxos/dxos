//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Result from 'effect/Result';

import type * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { Channel, Message, Person, Task } from '@dxos/types';

import { BrainSkill } from '#skills';
import { AgentChannels, BrainService, ChatParticipant, type Relay, RelayOperation } from '#types';

import { loadChats } from './agent-skills.ts';
import { ensureChannelChat } from './ensure-channel-chat.ts';
import { asParty, partyName } from './relay.ts';
import { applyStatus } from './update-relay.ts';

type Delivery = Operation.Definition.Output<typeof RelayOperation.SendMessage>;

const handler: Operation.WithHandler<typeof RelayOperation.SendMessage> = RelayOperation.SendMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, recipient: recipientRef, text, relay: relayRef }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const recipient = yield* asParty(yield* Database.load(recipientRef).pipe(Effect.orDie));
      const relay = relayRef ? yield* Database.load(relayRef).pipe(Effect.orDie) : undefined;
      const role = relay ? roleIn(relay, recipient) : undefined;

      const brain = yield* BrainService.BrainService;
      const deliver: Effect.Effect<Delivery, never, Database.Service | Operation.Service> = Effect.gen(function* () {
        // The requester asked from a particular conversation, so the outcome goes back there first.
        if (role === 'requester' && relay?.replyChannel) {
          const channel = yield* Database.load(relay.replyChannel).pipe(Effect.orDie);
          const sent = yield* postToChannel(agent, channel, relay.replyThread, text);
          if (sent.delivered) {
            return { delivered: true, via: 'channel', chat: Ref.make(sent.chat) };
          }
        }

        const chats = yield* loadChats(agent);
        const chat = chats
          .filter((chat) => ChatParticipant.get(chat) === recipient.id)
          .sort((left, right) => left.id.localeCompare(right.id))
          .at(-1);
        if (chat) {
          const conversation = AgentChannels.conversationOf(chat);
          const channel = conversation && (yield* findChannel(conversation.channelId));
          if (!conversation || !channel) {
            // A Composer chat: wake it, so the agent tells them in a turn of its own there.
            const woken = yield* brain
              .wake({ chat, prompt: BrainSkill.wakePrompt(partyName(recipient), text), sender: { name: agent.name } })
              .pipe(Effect.result);
            return Result.isSuccess(woken)
              ? { delivered: true, via: 'chat', chat: Ref.make(chat) }
              : { delivered: false, reason: woken.failure.message };
          }
          const sent = yield* postToChannel(agent, channel, conversation.thread, text);
          return sent.delivered
            ? { delivered: true, via: 'channel', chat: Ref.make(chat) }
            : { delivered: false, reason: sent.reason };
        }

        const name = partyName(recipient);
        if (!Obj.instanceOf(Person.Person, recipient)) {
          return { delivered: false, reason: `${name} has no conversation with the agent; ask who to tell there.` };
        }

        // No conversation yet: the first of the agent's channels that can reach the person directly.
        const channels = yield* AgentChannels.loadChannels(agent);
        const reasons: string[] = [];
        for (const channel of channels) {
          const direct = yield* openDirect(channel, recipient);
          if (direct.thread === undefined) {
            reasons.push(direct.reason ?? `${channel.name ?? 'A channel'} cannot reach them.`);
            continue;
          }
          const sent = yield* postToChannel(agent, channel, direct.thread, text);
          if (!sent.delivered) {
            return { delivered: false, reason: sent.reason };
          }
          // Replies in the direct conversation, and later deliveries, belong to this person's chat.
          Obj.update(sent.chat, (chat) => ChatParticipant.set(chat, recipient));
          return { delivered: true, via: 'channel', chat: Ref.make(sent.chat) };
        }

        return {
          delivered: false,
          reason:
            channels.length === 0
              ? `${name} has no conversation with the agent and the agent has no channels to reach them through.`
              : `${name} has no conversation with the agent and no known handle any of its channels can reach (${reasons.join(' ')}); ask the requester how to reach them.`,
        };
      });

      const delivery = yield* deliver;
      if (delivery.delivered && relay && role) {
        yield* applyStatus(relay, role === 'recipient' ? 'delivered' : 'reported');
      }
      return delivery;
    }),
  ),
);

export default handler;

/** Whether this delivery carries the relay to its recipient or reports back to its requester. */
const roleIn = (relay: Relay.Relay, party: Obj.Unknown): 'recipient' | 'requester' | undefined =>
  Task.refEntityId(relay.recipient) === party.id
    ? 'recipient'
    : relay.requester && Task.refEntityId(relay.requester) === party.id
      ? 'requester'
      : undefined;

/** Records the message in a Composer chat, where whoever has the chat open reads it. */
const appendToChat = (agent: Agent.Agent, chat: Chat.Chat, text: string, properties?: Record<string, unknown>) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
    yield* Feed.append(feed, [
      Message.make({
        sender: { role: 'assistant', name: agent.name },
        blocks: [{ _tag: 'text', text }],
        properties,
      }),
    ]);
  });

/** A channel in the space by entity id; a chat records only the id of the channel it mirrors. */
const findChannel = (id: string) =>
  Database.query(Filter.type(Channel.Channel)).run.pipe(
    Effect.map((channels) => channels.find((channel) => channel.id === id)),
    Effect.orDie,
  );

type Posted = { delivered: true; chat: Chat.Chat } | { delivered: false; reason?: string };

/**
 * Posts through the channel's backend and records the post in the agent's chat for that conversation,
 * stamped with the backend's receipt so a mirror of the chat (EDGE's Discord bot) does not post it again.
 */
const postToChannel = (agent: Agent.Agent, channel: Channel.Channel, thread: string | undefined, text: string) =>
  Effect.gen(function* () {
    const sent = yield* Operation.invoke(ThreadOperation.SendToChannel, { channel: Ref.make(channel), thread, text });
    if (!sent.delivered) {
      return { delivered: false, reason: sent.reason } satisfies Posted;
    }
    const chat = yield* ensureChannelChat({ agent, channel, thread }).pipe(Effect.orDie);
    yield* appendToChat(agent, chat, text, sent.properties);
    return { delivered: true, chat } satisfies Posted;
  }).pipe(Effect.orDie);

/**
 * Opens a direct conversation through the channel. A backend without direct messages fails the
 * operation; for delivery that only means this channel cannot reach the person, so it becomes a reason.
 */
const openDirect = (channel: Channel.Channel, person: Person.Person) =>
  Effect.gen(function* () {
    const exit = yield* Operation.invoke(ThreadOperation.OpenDirect, {
      channel: Ref.make(channel),
      person: Ref.make(person),
    }).pipe(Effect.exit);
    if (Exit.isSuccess(exit)) {
      return exit.value;
    }
    if (Cause.hasInterruptsOnly(exit.cause)) {
      return yield* Effect.failCause(exit.cause);
    }
    const error = Cause.squash(exit.cause);
    return { thread: undefined, reason: error instanceof Error ? error.message : String(error) };
  }).pipe(Effect.orDie);
