//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { Message, Person, Task } from '@dxos/types';

import { ChatParticipant, DiscordBinding, type Relay, RelayOperation } from '#types';

import { loadChats } from './agent-skills.ts';
import { sendDiscord } from './discord-rest.ts';
import { asParty, discordUserId, partyName } from './relay.ts';
import { applyStatus } from './update-relay.ts';

type Delivery = Operation.Definition.Output<typeof RelayOperation.SendMessage>;

/** The Discord channel a bridged chat mirrors, if it is a thread or DM chat. */
const discordChannelOf = (chat: Chat.Chat): string | undefined =>
  Obj.getMeta(chat).keys.find(
    ({ source }) => source === DiscordBinding.DISCORD_SOURCE || source === DiscordBinding.DISCORD_DM_SOURCE,
  )?.id;

/** Records the message in a Composer chat, where whoever has the chat open reads it. */
const appendToChat = (agent: Agent.Agent, chat: Chat.Chat, text: string) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
    yield* Feed.append(feed, [
      Message.make({ sender: { role: 'assistant', name: agent.name }, blocks: [{ _tag: 'text', text }] }),
    ]);
  });

const handler: Operation.WithHandler<typeof RelayOperation.SendMessage> = RelayOperation.SendMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, recipient: recipientRef, text, relay: relayRef }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const recipient = yield* asParty(yield* Database.load(recipientRef).pipe(Effect.orDie));
      const relay = relayRef ? yield* Database.load(relayRef).pipe(Effect.orDie) : undefined;
      const role = relay ? roleIn(relay, recipient) : undefined;
      const binding = yield* DiscordBinding.loadForAgent(agent);

      const deliver: Effect.Effect<Delivery, never, Database.Service> = Effect.gen(function* () {
        // The requester asked from a particular thread, so the outcome goes back there first.
        if (role === 'requester' && relay?.replyChannelId && binding) {
          const sent = yield* sendDiscord({ binding: Ref.make(binding), channelId: relay.replyChannelId, text }).pipe(
            Effect.orDie,
          );
          if (sent.delivered) {
            return { delivered: true, via: 'discord', chat: sent.chat && Ref.make(sent.chat) };
          }
        }

        const chats = yield* loadChats(agent);
        const chat = chats
          .filter((chat) => ChatParticipant.get(chat) === recipient.id)
          .sort((left, right) => left.id.localeCompare(right.id))
          .at(-1);
        if (chat) {
          const channelId = discordChannelOf(chat);
          if (channelId === undefined || !binding) {
            yield* appendToChat(agent, chat, text);
            return { delivered: true, via: 'chat', chat: Ref.make(chat) };
          }
          const sent = yield* sendDiscord({ binding: Ref.make(binding), channelId, text }).pipe(Effect.orDie);
          return sent.delivered
            ? { delivered: true, via: 'discord', chat: Ref.make(chat) }
            : { delivered: false, reason: sent.reason };
        }

        const userId = discordUserId(recipient);
        if (userId !== undefined && binding) {
          const sent = yield* sendDiscord({ binding: Ref.make(binding), userId, text }).pipe(Effect.orDie);
          if (!sent.delivered) {
            return { delivered: false, reason: sent.reason };
          }
          if (sent.chat && Obj.instanceOf(Person.Person, recipient)) {
            // Replies in the DM, and later deliveries, belong to this person's conversation.
            ChatParticipant.set(sent.chat, recipient);
          }
          return { delivered: true, via: 'discord', chat: sent.chat && Ref.make(sent.chat) };
        }

        const name = partyName(recipient);
        return {
          delivered: false,
          reason:
            userId === undefined
              ? `${name} has no conversation with the agent and no known Discord user id; ask the requester how to reach them.`
              : `${name} has no conversation with the agent and the agent has no Discord binding to DM them with.`,
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
