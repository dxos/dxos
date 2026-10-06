//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import type * as HttpClient from 'effect/http/HttpClient';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, type Feed, Obj, type Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as ChannelBackend from '@dxos/plugin-thread/ChannelBackend';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import { type Channel, Message } from '@dxos/types';

import { SlackChannel } from '#types';

import { SLACK_SOURCE } from '../constants.ts';
import { SlackChannelError, slackFailureReason } from '../errors.ts';
import { appendToMirror, tsToIso } from '../mirror.ts';
import { SlackApi } from '../services/index.ts';

/** A thread id that is a Slack `ts` replies in the channel's conversation; any other is a conversation id (a DM). */
const TS_PATTERN = /^\d+\.\d+$/;

/**
 * Slack channel backend: reads the mirror feed the Slack sync fills, posts as the config's bot token
 * with `chat.postMessage` (mirroring each post at once, keyed by its `ts`, so the next sync skips it),
 * and opens DMs from a person's `slack` identity. Receiving in real time (Events API or Socket Mode
 * on EDGE) is not built yet, so the backend has no connection; the sync is what brings messages in.
 */
export const slackChannelBackend: ThreadCapabilities.ChannelBackendProvider = {
  kind: SlackChannel.BACKEND_KIND,
  label: 'Slack',
  icon: 'ph--slack-logo--regular',
  createFields: SlackChannel.Properties,
  makeConfig: (options) => {
    invariant(Schema.is(SlackChannel.Properties)(options), 'Invalid Slack channel options.');
    return SlackChannel.make(options);
  },
  subscribe: (channel, onMessages) => {
    let unsubscribe: (() => void) | undefined;
    const fiber = Effect.runFork(
      Effect.gen(function* () {
        const { config } = yield* loadConfig(channel);
        const feed = yield* load(config.feed, 'Slack mirror feed');
        const db = Obj.getDatabase(channel);
        if (!db) {
          return yield* Effect.fail(new SlackChannelError({ message: 'The channel is not in a space.' }));
        }
        unsubscribe = ChannelBackend.subscribeFeed(db, feed, onMessages);
      }).pipe(Effect.catch(() => Effect.sync(() => onMessages([])))),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
      unsubscribe?.();
    };
  },
  send: Effect.fnUntraced(function* (channel, message) {
    const { config } = yield* loadConfig(channel);
    return yield* post(channel, config, config.conversationId, message);
  }),
  // Posting from the article would bypass the agent and post as its bot, so the composer stays hidden.
  readOnly: () => true,
  openDirect: Effect.fnUntraced(function* (channel, person) {
    const userId = person.identities?.find((identity) => identity.label === 'slack')?.value;
    if (userId === undefined) {
      return undefined;
    }
    const { config } = yield* loadConfig(channel);
    return yield* withToken(config, SlackApi.openConversation(userId));
  }),
  threads: {
    send: Effect.fnUntraced(function* (channel, thread, message) {
      const { config } = yield* loadConfig(channel);
      return TS_PATTERN.test(thread)
        ? yield* post(channel, config, config.conversationId, message, thread)
        : yield* post(channel, config, thread, message);
    }),
  },
};

/** Contributes the Slack channel backend. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ThreadCapabilities.ChannelBackend, slackChannelBackend);
  }),
);

const load = <T>(ref: Ref.Ref<T>, what: string) =>
  Effect.tryPromise({
    try: () => ref.load(),
    catch: (cause) => new SlackChannelError({ message: `Could not load the ${what}.`, cause }),
  });

const loadConfig = Effect.fnUntraced(function* (channel: Channel.Channel) {
  const config = yield* load(channel.backend.config, 'Slack channel config');
  if (!SlackChannel.instanceOf(config)) {
    return yield* Effect.fail(new SlackChannelError({ message: 'The channel has no Slack config.' }));
  }
  return { config };
});

/** Runs a Slack API call with the config's token, mapping Slack's refusal to a reason a person can act on. */
const withToken = Effect.fnUntraced(function* <T, E>(
  config: SlackChannel.SlackChannel,
  effect: Effect.Effect<T, E, SlackApi.SlackCredentials | HttpClient.HttpClient>,
) {
  const accessToken = yield* load(config.accessToken, 'Slack token');
  return yield* effect.pipe(
    Effect.provide(
      Layer.merge(Layer.succeed(SlackApi.SlackCredentials, { token: accessToken.token }), FetchHttpClient.layer),
    ),
    Effect.mapError((error) => new SlackChannelError({ message: slackFailureReason(error), cause: error })),
  );
});

/**
 * Posts a message's text and returns the receipt. A post into the channel's own conversation is
 * mirrored into its feed straight away; a DM lives in another conversation, which nothing mirrors.
 */
const post = Effect.fnUntraced(function* (
  channel: Channel.Channel,
  config: SlackChannel.SlackChannel,
  conversationId: string,
  message: Message.Message,
  threadTs?: string,
) {
  const response = yield* withToken(
    config,
    SlackApi.postMessage(conversationId, Message.extractText(message), { threadTs }),
  );
  const ts = response.ts;
  if (ts === undefined) {
    return yield* Effect.fail(new SlackChannelError({ message: 'Slack accepted the post but returned no ts.' }));
  }
  const postedIn = response.channel ?? conversationId;
  if (postedIn === config.conversationId) {
    yield* mirror(channel, config.feed, message, ts, threadTs);
  }
  return { messageIds: [ts], properties: { slack: { channel: postedIn, ts, threadTs } } };
});

const mirror = Effect.fnUntraced(function* (
  channel: Channel.Channel,
  feedRef: Ref.Ref<Feed.Feed>,
  message: Message.Message,
  ts: string,
  threadTs: string | undefined,
) {
  const db = Obj.getDatabase(channel);
  if (!db) {
    return;
  }
  const feed = yield* load(feedRef, 'Slack mirror feed');
  const mirrored = Message.make({
    [Obj.Meta]: { keys: [{ source: SLACK_SOURCE, id: ts }] },
    created: tsToIso(ts),
    threadId: threadTs,
    sender: message.sender,
    blocks: message.blocks,
  });
  yield* appendToMirror(feed, [mirrored]).pipe(Effect.provide(Database.layer(db)));
});
