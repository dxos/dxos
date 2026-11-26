//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj, type Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { type AccessToken } from '@dxos/link';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import type * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { type Channel, Message } from '@dxos/types';

import { DiscordBot, DiscordChannel } from '#types';

import { DiscordChannelError } from '../errors.ts';
import {
  type EdgeClientResolver,
  appEdgeClient,
  callBot,
  callBotRoute,
  toConnectionStatus,
} from '../services/bot-gateway.ts';
import { makeEdgeDiscordBot } from '../services/edge-discord-bot.ts';

export type DiscordChannelBackendOptions = {
  /** Where the EDGE client for the bot routes comes from; the app's client by default. */
  edgeClient?: EdgeClientResolver;
  /** The bot sends go through: the one EDGE serves an operation handler, else one over `edgeClient`. */
  bot?: DiscordBot.Service;
};

/**
 * Discord channel backend: starts the bot's EDGE gateway, which receives messages and drives agent turns. Sends post
 * through the bot's `act` on EDGE, which holds the token (a thread or DM channel id is a Discord channel id); a DM is
 * named by the person's `discord` identity and opened by the bot on the first post to it.
 */
export const makeDiscordChannelBackend = ({
  edgeClient = appEdgeClient,
  bot,
}: DiscordChannelBackendOptions = {}): ThreadCapabilities.ChannelBackendProvider => {
  /** Acts as the channel's bot; the receipt names the Discord channel the post landed in (a DM's, once opened). */
  const act = (channel: Channel.Channel, action: DiscordBot.Action) =>
    Effect.gen(function* () {
      const { config, spaceId } = yield* loadConfig(channel);
      const service = bot ?? makeEdgeDiscordBot(yield* edgeClient);
      const posted = yield* service.act(
        {
          applicationId: config.applicationId,
          spaceId,
          channel: EID.make({ spaceId, entityId: channel.id }),
        },
        action,
      );
      const messageIds = posted.messageId === undefined ? [] : [posted.messageId];
      return {
        thread: posted.channelId,
        messageIds,
        properties: { discord: { channelId: posted.channelId, messageId: posted.messageId } },
      } satisfies ThreadOperation.SendReceipt;
    });

  return {
    kind: DiscordChannel.BACKEND_KIND,
    label: 'Discord',
    icon: 'ph--discord-logo--regular',
    createFields: DiscordChannel.Properties,
    makeConfig: (options) => {
      invariant(Schema.is(DiscordChannel.Properties)(options), 'Invalid Discord channel options.');
      return DiscordChannel.make(options);
    },
    // Inbound messages reach the agent's chats through EDGE's gateway, not this channel's article.
    subscribe: (_channel, onMessages) => {
      onMessages([]);
      return () => {};
    },
    send: (channel, message) =>
      Effect.gen(function* () {
        const { config } = yield* loadConfig(channel);
        const target = config.channels.at(0);
        if (target === undefined) {
          return yield* Effect.fail(new DiscordChannelError({ message: 'The Discord channel lists no channel ids.' }));
        }
        return yield* act(channel, { kind: 'post', channelId: target, text: Message.extractText(message) });
      }),
    // Posting from the article would bypass the agent, so the composer stays hidden.
    readOnly: () => true,
    // No Discord call: the bot opens the DM with the token EDGE holds when the first message is sent to it.
    openDirect: Effect.fnUntraced(function* (_channel, person) {
      const discord = DiscordBot.discordIdentities(person);
      if (discord.length === 0) {
        return undefined;
      }
      // Only an unambiguous id, since nothing is looked up here: `@` before digits may be a numeric username, and a
      // handle beside an id on the same contact is not checked against it (their own id is trusted).
      const ids = [...new Set(discord.flatMap((value) => DiscordBot.explicitUserId(value) ?? []))];
      if (ids.length === 1) {
        return DiscordChannel.pendingDmThread(ids[0]);
      }
      const name = person.fullName || person.nickname || 'This person';
      return yield* Effect.fail(
        new DiscordChannelError({
          message:
            ids.length > 1
              ? `${name} has more than one Discord user id on record: ${ids.join(', ')}.`
              : `${name}'s Discord identity (${discord.join(', ')}) is not a user id; record their Discord user id to message them directly.`,
        }),
      );
    }),
    threads: {
      send: (channel, thread, message) => {
        const text = Message.extractText(message);
        const userId = DiscordChannel.pendingDmUser(thread);
        return act(
          channel,
          userId === undefined ? { kind: 'post', channelId: thread, text } : { kind: 'dm', userId, text },
        );
      },
      remove: (channel, thread) =>
        Effect.gen(function* () {
          // Through EDGE, which holds the bot's real token (a space may only record a placeholder) and reaches Discord
          // without the browser's CORS limits.
          const { config, spaceId } = yield* loadConfig(channel);
          const edge = yield* edgeClient;
          const query = new URLSearchParams({ spaceId });
          // Kai's config names no token object: EDGE uses its own.
          const accessToken = config.accessToken;
          if (accessToken) {
            query.set('accessToken', (yield* loadAccessToken(accessToken)).id);
          }
          yield* callBotRoute(
            edge,
            config.applicationId,
            `/threads/${encodeURIComponent(thread)}?${query.toString()}`,
            { method: 'DELETE' },
            DeletedAnswer,
          );
        }),
    },
    connection: {
      start: (channel) =>
        Effect.gen(function* () {
          const { config, spaceId } = yield* loadConfig(channel);
          const edge = yield* edgeClient;
          const status = yield* callBot(edge, config.applicationId, {
            method: 'PUT',
            body: {
              spaceId,
              // EDGE reads the bot settings from the config object and resolves the channel's agent from the channel.
              binding: EID.make({ spaceId, entityId: config.id }),
              channel: EID.make({ spaceId, entityId: channel.id }),
            },
          });
          return toConnectionStatus(status, config.id);
        }),
      stop: (channel) =>
        Effect.gen(function* () {
          const { config } = yield* loadConfig(channel);
          const edge = yield* edgeClient;
          return toConnectionStatus(yield* callBot(edge, config.applicationId, { method: 'DELETE' }), config.id);
        }),
      status: (channel) =>
        Effect.gen(function* () {
          const { config } = yield* loadConfig(channel);
          const edge = yield* edgeClient;
          return toConnectionStatus(yield* callBot(edge, config.applicationId, { method: 'GET' }), config.id);
        }),
    },
  };
};

/** Contributes the Discord channel backend. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ThreadCapabilities.ChannelBackend, makeDiscordChannelBackend());
  }),
);

/** EDGE's answer to a thread deletion. */
const DeletedAnswer = Schema.Struct({ deleted: Schema.Boolean });

const loadConfig = (channel: Channel.Channel) =>
  Effect.gen(function* () {
    const config = yield* Effect.tryPromise({
      try: () => channel.backend.config.load(),
      catch: (cause) => new DiscordChannelError({ message: 'Could not load the Discord channel config.', cause }),
    });
    if (!DiscordChannel.instanceOf(config)) {
      return yield* Effect.fail(new DiscordChannelError({ message: 'The channel has no Discord config.' }));
    }
    if (!config.applicationId) {
      return yield* Effect.fail(new DiscordChannelError({ message: 'The Discord channel has no application id.' }));
    }
    const spaceId = Obj.getDatabase(channel)?.spaceId;
    if (!spaceId) {
      return yield* Effect.fail(new DiscordChannelError({ message: 'The channel is not in a space.' }));
    }
    return { config, spaceId };
  });

const loadAccessToken = (ref: Ref.Ref<AccessToken.AccessToken>) =>
  Effect.tryPromise({
    try: () => ref.load(),
    catch: (cause) => new DiscordChannelError({ message: 'Could not load the bot token.', cause }),
  });
