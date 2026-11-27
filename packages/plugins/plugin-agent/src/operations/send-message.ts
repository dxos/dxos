//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Result from 'effect/Result';

import type * as Capability from '@dxos/app-framework/Capability';
import type * as Agent from '@dxos/compute/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { Channel, Person, Task } from '@dxos/types';

import { BrainSkill } from '#skills';
import { AgentChannels, BrainService, ChatParticipant, type Relay, RelayOperation } from '#types';

import { loadChats } from './agent-skills.ts';
import { appendToChat, ensureChannelChat } from './ensure-channel-chat.ts';
import { asParty, partyName } from './relay.ts';
import { applyStatus } from './update-relay.ts';

type Delivery = Operation.Definition.Output<typeof RelayOperation.SendMessage>;

type Services = Database.Service | Operation.Service | Capability.Service;

const handler: Operation.WithHandler<typeof RelayOperation.SendMessage> = RelayOperation.SendMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, recipient: recipientRef, text, relay: relayRef }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const recipient = yield* asParty(yield* Database.load(recipientRef).pipe(Effect.orDie));
      const relay = relayRef ? yield* Database.load(relayRef).pipe(Effect.orDie) : undefined;
      const role = relay ? roleIn(relay, recipient) : undefined;

      const brain = yield* BrainService.BrainService;
      const deliver: Effect.Effect<Delivery, never, Services> = Effect.gen(function* () {
        // Only the agent's current channels: a disconnected one keeps its conversations, but no longer posts.
        const channels = yield* AgentChannels.loadChannels(agent);

        // The requester asked from a particular conversation, so the outcome goes back there first.
        const replyChannelId = relay?.replyChannel ? Task.refEntityId(relay.replyChannel) : undefined;
        const replyChannel = replyChannelId ? channels.find(({ id }) => id === replyChannelId) : undefined;
        if (role === 'requester' && replyChannel) {
          const sent = yield* postToChannel(agent, replyChannel, relay?.replyThread, text);
          if (sent.delivered) {
            return { delivered: true, via: 'channel', chat: Ref.make(sent.chat) };
          }
        }

        // Newest first: a person's latest conversation with the agent is the one they are most likely to read.
        const chats = (yield* loadChats(agent))
          .filter((chat) => ChatParticipant.get(chat) === recipient.id)
          .sort((left, right) => right.id.localeCompare(left.id));

        // A conversation on a channel (a Discord thread or DM) reaches them where they talk to the agent; one that refuses
        // (a deleted thread) falls through to the next, then to the routes below.
        const reasons: string[] = [];
        for (const chat of chats) {
          const conversation = AgentChannels.conversationOf(chat);
          const channel = conversation && channels.find(({ id }) => id === conversation.channelId);
          if (conversation && channel) {
            const sent = yield* postToChannel(agent, channel, conversation.thread, text);
            if (sent.delivered) {
              // The backend may resolve a pending thread, so the message lands in another chat, which must belong to
              // the recipient for the lookup above to find it next time.
              if (sent.chat.id !== chat.id) {
                Obj.update(sent.chat, (landed) => ChatParticipant.set(landed, recipient));
              }
              return { delivered: true, via: 'channel', chat: Ref.make(sent.chat) };
            }
            reasons.push(sent.reason ?? `${channel.name ?? 'A channel'} refused the message.`);
          }
        }

        // Then a direct conversation opened through one of the agent's channels, before a Composer chat the person
        // may never have open.
        const name = partyName(recipient);
        if (Obj.instanceOf(Person.Person, recipient)) {
          for (const channel of channels) {
            const direct = yield* openDirect(channel, recipient);
            if (direct.thread === undefined) {
              reasons.push(direct.reason ?? `${channel.name ?? 'A channel'} cannot reach them.`);
              continue;
            }
            const sent = yield* postToChannel(agent, channel, direct.thread, text);
            if (!sent.delivered) {
              // A refused DM (closed DMs) falls through to the next channel, then the Composer chat.
              reasons.push(sent.reason ?? `${channel.name ?? 'A channel'} refused the direct message.`);
              continue;
            }
            // Replies in the direct conversation, and later deliveries, belong to this person's chat.
            Obj.update(sent.chat, (chat) => ChatParticipant.set(chat, recipient));
            return { delivered: true, via: 'channel', chat: Ref.make(sent.chat) };
          }
        }

        // Last, a Composer chat: wake it, so the agent tells them in a turn of its own there.
        const composerChat = chats.find((chat) => AgentChannels.conversationOf(chat) === undefined);
        if (composerChat) {
          const woken = yield* brain
            .wake({
              chat: composerChat,
              prompt: BrainSkill.wakePrompt(partyName(recipient), text),
              sender: { name: agent.name },
            })
            .pipe(Effect.result);
          return Result.isSuccess(woken)
            ? { delivered: true, via: 'chat', chat: Ref.make(composerChat) }
            : { delivered: false, reason: woken.failure.message };
        }

        if (!Obj.instanceOf(Person.Person, recipient)) {
          return { delivered: false, reason: `${name} has no conversation with the agent; ask who to tell there.` };
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

type Posted = { delivered: true; chat: Agent.Session } | { delivered: false; reason?: string };

/**
 * Posts into a channel conversation through its backend and records it, with the backend's receipt, in the agent's
 * chat for that conversation. The chat is keyed by the thread the backend reports, so a DM opened by its first post
 * (Discord) shares the chat its replies arrive in.
 */
const postToChannel = (agent: Agent.Agent, channel: Channel.Channel, thread: string | undefined, text: string) =>
  Effect.gen(function* () {
    const sent = yield* Operation.invoke(ThreadOperation.SendToChannel, { channel: Ref.make(channel), thread, text });
    if (!sent.delivered) {
      return { delivered: false, reason: sent.reason } satisfies Posted;
    }
    const chat = yield* ensureChannelChat({ agent, channel, thread: sent.thread ?? thread }).pipe(Effect.orDie);
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
