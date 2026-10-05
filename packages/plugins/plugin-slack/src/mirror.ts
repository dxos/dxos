//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { type AccessToken } from '@dxos/link';
import { Channel, Message } from '@dxos/types';

import { SlackChannel } from '#types';

import { SLACK_SOURCE } from './constants.ts';

/**
 * Slack `ts` is a string like `"1700000000.000123"` — seconds with a 6-digit subsecond fraction.
 * `Date` has millisecond resolution, so the original `ts` is kept as the message's foreign key.
 */
export const tsToIso = (ts: string): string => {
  const seconds = Number.parseFloat(ts);
  if (!Number.isFinite(seconds)) {
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
};

/** The Slack `ts` a mirrored message is keyed by. */
export const getMessageTs = (message: Message.Message): string | undefined =>
  Obj.getMeta(message).keys.find((key) => key.source === SLACK_SOURCE)?.id;

/**
 * Appends messages to a Slack mirror feed, skipping any whose `ts` the feed already holds, so a
 * message the backend posted (and mirrored at once) is not appended again by the next sync.
 * Returns the messages actually appended.
 */
export const appendToMirror = (
  feed: Feed.Feed,
  messages: readonly Message.Message[],
): Effect.Effect<Message.Message[], never, Database.Service> =>
  Effect.gen(function* () {
    const keys = messages.flatMap((message) => {
      const ts = getMessageTs(message);
      return ts === undefined ? [] : [{ source: SLACK_SOURCE, id: ts }];
    });
    const existing =
      keys.length === 0
        ? []
        : yield* Database.query(Query.select(Filter.foreignKeys(Message.Message, keys)).from(feed)).run;
    const seen = new Set(existing.map(getMessageTs));
    const fresh = messages.filter((message) => {
      const ts = getMessageTs(message);
      return ts === undefined || !seen.has(ts);
    });
    if (fresh.length > 0) {
      yield* Feed.append(feed, fresh).pipe(Effect.provideService(Database.Origin, 'system'));
    }
    return fresh;
  });

/**
 * Brings a Slack channel onto the Slack backend and returns its config. Idempotent: a channel
 * already on it is returned as is; a channel from before the backend existed (feed-backed, keyed
 * by its conversation) adopts its existing feed as the config's mirror, so no history is lost.
 */
export const upgradeChannel: (
  channel: Channel.Channel,
  options: { accessToken: Ref.Ref<AccessToken.AccessToken>; conversationId: string },
) => Effect.Effect<SlackChannel.SlackChannel | undefined, never, Database.Service> = Effect.fn('upgradeChannel')(
  function* (channel, options) {
    // A config that cannot be loaded leaves nothing to upgrade from; the caller reports it.
    const current = yield* Database.load(channel.backend.config).pipe(Effect.catch(() => Effect.succeed(undefined)));
    if (channel.backend.kind === SlackChannel.BACKEND_KIND) {
      return SlackChannel.instanceOf(current) ? current : undefined;
    }
    if (channel.backend.kind !== Channel.FeedBackendKind || !Obj.instanceOf(Feed.Feed, current)) {
      return undefined;
    }

    const config = SlackChannel.make({
      accessToken: options.accessToken,
      conversationId: options.conversationId,
      feed: current,
    });
    Obj.update(channel, (channel) => {
      channel.backend = { kind: SlackChannel.BACKEND_KIND, config: Ref.make(config) };
    });
    return config;
  },
);
