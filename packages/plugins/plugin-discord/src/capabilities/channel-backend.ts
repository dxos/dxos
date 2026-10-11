//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import { isManagedAccessToken } from '@dxos/protocols';
import { type Channel, Message } from '@dxos/types';

import { DiscordChannel } from '#types';

import { DiscordChannelError } from '../errors.ts';
import {
  type EdgeClientResolver,
  appEdgeClient,
  callBot,
  callBotRoute,
  toConnectionStatus,
} from '../services/bot-gateway.ts';
import { openDirectMessage, postText } from '../services/bot-rest.ts';

export type DiscordChannelBackendOptions = {
  /** Where the EDGE client for the bot routes comes from; the app's client by default. */
  edgeClient?: EdgeClientResolver;
};

/**
 * Discord channel backend: starts the bot's EDGE gateway, which receives messages, drives agent turns and posts
 * what agents write into their conversation chats (so the backend is `mirrored`). Direct sends post as the config's
 * bot over Discord REST (a thread or DM channel id is a Discord channel id); a DM is named by the person's `discord`
 * identity and opened by whoever posts to it first.
 */
export const makeDiscordChannelBackend = ({
  edgeClient = appEdgeClient,
}: DiscordChannelBackendOptions = {}): ThreadCapabilities.ChannelBackendProvider => ({
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
      const { config, token } = yield* loadBot(channel);
      const target = config.channels.at(0);
      if (target === undefined) {
        return yield* Effect.fail(new DiscordChannelError({ message: 'The Discord channel lists no channel ids.' }));
      }
      return yield* post(token, target, message);
    }),
  // Posting from the article would bypass the agent, so the composer stays hidden.
  readOnly: () => true,
  mirrored: true,
  // No Discord call: EDGE's bot opens the DM with the token it holds when it posts the agent's message.
  openDirect: (_channel, person) =>
    Effect.sync(() => {
      const userId = person.identities?.find((identity) => identity.label === 'discord')?.value;
      return userId === undefined ? undefined : DiscordChannel.pendingDmThread(userId);
    }),
  threads: {
    send: (channel, thread, message) =>
      Effect.gen(function* () {
        const { token } = yield* loadBot(channel);
        const userId = DiscordChannel.pendingDmUser(thread);
        const target = userId === undefined ? thread : yield* openDirectMessage(token, userId);
        return yield* post(token, target, message);
      }),
    remove: (channel, thread) =>
      Effect.gen(function* () {
        // Through EDGE, which holds the bot's real token (a space may only record a placeholder) and reaches Discord
        // without the browser's CORS limits.
        const { config, spaceId } = yield* loadConfig(channel);
        const accessToken = yield* Effect.tryPromise({
          try: () => config.accessToken.load(),
          catch: (cause) => new DiscordChannelError({ message: 'Could not load the bot token.', cause }),
        });
        const edge = yield* edgeClient;
        const query = new URLSearchParams({ spaceId, accessToken: accessToken.id });
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
});

/** Contributes the Discord channel backend. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ThreadCapabilities.ChannelBackend, makeDiscordChannelBackend());
  }),
);

/** Posts a message's text and returns the receipt EDGE's mirror reads to skip what was already posted. */
const post = (token: string, target: string, message: Message.Message) =>
  Effect.map(postText(token, target, Message.extractText(message)), (messageIds) => ({
    messageIds,
    properties: { discord: { channelId: target, messageId: messageIds.at(0), messageIds } },
  }));

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

/** The config and a pasted bot token; an EDGE-managed token cannot be read here. */
const loadBot = (channel: Channel.Channel) =>
  Effect.gen(function* () {
    const { config } = yield* loadConfig(channel);
    const accessToken = yield* Effect.tryPromise({
      try: () => config.accessToken.load(),
      catch: (cause) => new DiscordChannelError({ message: 'Could not load the bot token.', cause }),
    });
    if (isManagedAccessToken(accessToken.token)) {
      return yield* Effect.fail(
        new DiscordChannelError({
          message:
            'The bot token is managed by EDGE, which sending messages does not support yet; use a pasted bot token.',
        }),
      );
    }
    return { config, token: accessToken.token };
  });
