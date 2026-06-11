//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Channel, ContentBlock, Message } from '@dxos/types';

import { meta } from '#meta';

import { SLACK_SOURCE } from '../constants';
import { IntegrationDatabaseMissingError, formatSlackSyncFailure } from '../errors';
import { SlackApi } from '../services';
import { SlackOperation } from '../types';

type SlackConversation = SlackApi.SlackConversation;
type SlackMessage = SlackApi.SlackMessage;

/** Pull reconcile result. */
export type PullResult = {
  added: number;
};

/**
 * Slack `ts` is a string like `"1700000000.000123"` — seconds with a 6-digit
 * subsecond fraction. Convert to ISO for `Message.created`. We strip subsecond
 * precision because `Date` only has millisecond resolution; the original `ts`
 * is preserved as the foreign key.
 */
const tsToIso = (ts: string): string => {
  const seconds = Number.parseFloat(ts);
  if (!Number.isFinite(seconds)) {
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
};

const friendlyChannelName = (conversation: SlackConversation): string => {
  if (conversation.name && conversation.name.length > 0) {
    return conversation.is_channel || conversation.is_group ? `#${conversation.name}` : conversation.name;
  }
  if (conversation.is_im && conversation.user) {
    return `DM with ${conversation.user}`;
  }
  return conversation.id;
};

/**
 * Maps a Slack message into a `@dxos/types` Message.
 *
 * - `created` from the Slack `ts` (millisecond-truncated; original `ts` lives
 *   in the foreign key).
 * - `threadId` from `thread_ts` so threaded replies cluster under their parent
 *   on read without a separate object type. The parent message itself has
 *   `thread_ts === ts` when `reply_count > 0`; we preserve that, so a query
 *   for `threadId == ts` returns parent + replies together.
 * - `sender.name` is resolved through a layered fallback that always produces
 *   a non-empty value:
 *     1. resolved user `display_name` / `real_name` / `name` (most messages),
 *     2. resolved bot name via `bots.info` (bot-posted messages where Slack
 *        supplies only `bot_id`),
 *     3. Slack's own `username` field on the message (legacy bot integrations
 *        and webhook posts),
 *     4. the raw `user` / `bot_id` (opaque but stable),
 *     5. literal `'unknown'`.
 *   `username` is preferred over the raw id because the latter is opaque
 *   (`U0B0X8EKP1Q`) while `username` is human-readable (`composer`).
 * - `sender.email` if the user-info lookup returned one.
 * - `blocks` is currently a single `Text` block from the Slack `text` field.
 *   Slack's rich-text `blocks` array is intentionally NOT mapped yet — it
 *   would require a Slack-block → ContentBlock translator that's a separate
 *   piece of work.
 */
const mapSlackMessage = (
  message: SlackMessage,
  userById: Map<string, SlackApi.SlackUser>,
  botById: Map<string, SlackApi.SlackBot>,
): Message.Message | undefined => {
  if (message.subtype === 'channel_join' || message.subtype === 'channel_leave') {
    return undefined;
  }
  const text = message.text ?? '';
  const blocks: ContentBlock.Any[] = text.length > 0 ? [{ _tag: 'text', text } as ContentBlock.Text] : [];

  const slackUser = message.user ? userById.get(message.user) : undefined;
  const slackBot = message.bot_id ? botById.get(message.bot_id) : undefined;
  const senderName =
    (slackUser?.profile?.display_name && slackUser.profile.display_name.length > 0
      ? slackUser.profile.display_name
      : undefined) ??
    slackUser?.real_name ??
    slackUser?.name ??
    slackBot?.name ??
    message.username ??
    message.user ??
    message.bot_id ??
    'unknown';

  return Message.make({
    [Obj.Meta]: { keys: [{ source: SLACK_SOURCE, id: message.ts }] },
    created: tsToIso(message.ts),
    threadId: message.thread_ts,
    sender: {
      role: 'user',
      name: senderName,
      email: slackUser?.profile?.email,
    },
    blocks,
  });
};

/**
 * Finds an existing Channel whose foreign key matches the given Slack conversation id.
 */
export const findChannelForConversation: (
  conversationId: string,
) => Effect.Effect<Channel.Channel | undefined, never, Database.Service> = Effect.fn('findChannelForConversation')(
  function* (conversationId) {
    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Channel.Channel, [{ source: SLACK_SOURCE, id: conversationId }])),
    ).run;
    return existing.length > 0 ? (existing[0] as Channel.Channel) : undefined;
  },
);

/**
 * Finds an existing Channel for a Slack conversation, or creates a fresh one
 * (with the foreign key set and a backing feed). Idempotent: re-running on the
 * same `(space, conversation)` returns the same Channel.
 */
export const findOrCreateChannelForConversation: (
  conversation: SlackConversation,
) => Effect.Effect<Channel.Channel, never, Database.Service> = Effect.fn('findOrCreateChannelForConversation')(
  function* (conversation) {
    const existing = yield* findChannelForConversation(conversation.id);
    if (existing) {
      return existing;
    }
    const channel = Channel.make({
      [Obj.Meta]: { keys: [{ source: SLACK_SOURCE, id: conversation.id }] },
      name: friendlyChannelName(conversation),
    });
    return yield* Database.add(channel);
  },
);

/**
 * Resolves Slack user ids referenced in `messages` to {@link SlackApi.SlackUser}
 * records, using a per-sync cache so each id is only fetched once. Skipped
 * for messages that have only `bot_id` (those are resolved separately via
 * {@link resolveBots}) since `users.info` does not accept bot ids.
 *
 * Failed lookups (deleted users, missing scopes) silently fall through —
 * `mapSlackMessage` substitutes a layered name fallback when the resolved
 * record is missing, so a missing scope degrades gracefully rather than
 * blocking the sync.
 */
const resolveUsers = (
  messages: ReadonlyArray<SlackMessage>,
): Effect.Effect<
  Map<string, SlackApi.SlackUser>,
  never,
  import('@effect/platform/HttpClient').HttpClient | SlackApi.SlackCredentials
> =>
  Effect.gen(function* () {
    const ids = new Set<string>();
    for (const message of messages) {
      if (message.user) {
        ids.add(message.user);
      }
    }
    const out = new Map<string, SlackApi.SlackUser>();
    yield* Effect.forEach(
      Array.from(ids),
      (id) =>
        SlackApi.fetchUser(id).pipe(
          Effect.tap((user) => Effect.sync(() => user && out.set(id, user))),
          Effect.catchAll((error) => {
            log.catch(error);
            return Effect.void;
          }),
        ),
      { concurrency: 4, discard: true },
    );
    return out;
  });

/**
 * Resolves Slack bot ids referenced in `messages` to {@link SlackApi.SlackBot}
 * records via `bots.info`, with the same per-sync cache + silent-failure
 * behavior as {@link resolveUsers}. Bot-posted messages (incoming-webhook
 * posts, legacy bot users) carry only `bot_id` (`B…`); their friendly name
 * is not reachable through `users.info`.
 */
const resolveBots = (
  messages: ReadonlyArray<SlackMessage>,
): Effect.Effect<
  Map<string, SlackApi.SlackBot>,
  never,
  import('@effect/platform/HttpClient').HttpClient | SlackApi.SlackCredentials
> =>
  Effect.gen(function* () {
    const ids = new Set<string>();
    for (const message of messages) {
      if (message.bot_id) {
        ids.add(message.bot_id);
      }
    }
    const out = new Map<string, SlackApi.SlackBot>();
    yield* Effect.forEach(
      Array.from(ids),
      (id) =>
        SlackApi.fetchBot(id).pipe(
          Effect.tap((bot) => Effect.sync(() => bot && out.set(id, bot))),
          Effect.catchAll((error) => {
            log.catch(error);
            return Effect.void;
          }),
        ),
      { concurrency: 4, discard: true },
    );
    return out;
  });

const TARGET_CONCURRENCY = 3;

/**
 * Reconciles messages for currently-selected Slack targets on the Integration.
 *
 * Pull-only. Per target:
 *  1. Resolve (or materialize) the local Channel keyed by the Slack conversation id.
 *  2. Ask Slack for messages since `target.cursor` (or all history on first sync).
 *  3. Resolve referenced user ids in one batch (cached per sync).
 *  4. Map each Slack message → `@dxos/types` Message and append the batch to
 *     the channel's feed.
 *  5. Update `target.cursor` to the newest `ts` seen so the next sync is incremental.
 *
 * Failure on one target writes `lastError` on that target only and continues
 * with the next; targets are processed in parallel up to `TARGET_CONCURRENCY`.
 *
 * `Database.Service` and `Feed.FeedService` are provided inside the handler.
 * The integration's `target` ref carries the database; the space (and its
 * `queues`, used to build `Feed.FeedService`) is resolved via the Client
 * capability — same shape as `plugin-thread`'s `AppendChannelMessage`.
 */
const handler: Operation.WithHandler<typeof SlackOperation.SyncSlackChannel> = SlackOperation.SyncSlackChannel.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration, channel: channelRef }) {
      const integrationTarget = integration.target;
      const db = integrationTarget ? Obj.getDatabase(integrationTarget) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found');

      const integrationId = EID.getEntityId(EID.tryParse(integration.uri)!) ?? 'unknown';
      const toastIdSuffix = channelRef
        ? `${integrationId}.${EID.getEntityId(EID.tryParse(channelRef.uri)!) ?? 'unknown'}`
        : integrationId;

      const outcome = yield* Effect.either(
        Effect.gen(function* () {
          const integrationObj = yield* Database.load(integration);

          // One round-trip up front to get every conversation the user has
          // selected; we rely on `conversations.list` (vs. per-channel `info`)
          // because targets often number in the dozens.
          const allConversations = yield* SlackApi.fetchConversations();
          const conversationsById = new Map(allConversations.map((c) => [c.id, c]));

          const channelFilterId = channelRef ? EID.getEntityId(EID.tryParse(channelRef.uri)!) : undefined;
          type TargetEntry = {
            entry: (typeof integrationObj.targets)[number];
            channel: Channel.Channel;
            conversationId: string;
            conversation: SlackConversation;
          };
          const targetEntries: TargetEntry[] = [];
          for (const target of integrationObj.targets) {
            let foreignId = target.remoteId;
            let localObj = target.object?.target;
            if (foreignId === undefined && localObj) {
              foreignId = Obj.getMeta(localObj).keys.find((key) => key.source === SLACK_SOURCE)?.id;
            }
            if (foreignId === undefined) {
              continue;
            }
            const conversation = conversationsById.get(foreignId);
            if (!conversation) {
              continue;
            }
            if (!localObj) {
              localObj = yield* findOrCreateChannelForConversation(conversation);
              const materializedRef = Ref.make(localObj);
              Obj.update(integrationObj, (integrationObj) => {
                const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                const idx = mutable.targets.findIndex((entry) => entry.remoteId === foreignId);
                if (idx >= 0) {
                  mutable.targets[idx] = { ...mutable.targets[idx], object: materializedRef };
                }
              });
            }

            const targetEchoId = EID.getEntityId(EID.tryParse(Ref.make(localObj).uri)!);
            if (channelFilterId && targetEchoId !== channelFilterId) {
              continue;
            }
            if (!Channel.instanceOf(localObj)) {
              continue;
            }

            targetEntries.push({ entry: target, channel: localObj, conversationId: foreignId, conversation });
          }

          const perTarget = yield* Effect.forEach(
            targetEntries,
            ({ channel: targetChannel, conversationId, conversation }) =>
              Effect.gen(function* () {
                const result = yield* Effect.either(
                  Effect.gen(function* () {
                    const cursor = integrationObj.targets.find((entry) => entry.remoteId === conversationId)?.cursor;
                    const messages = yield* SlackApi.fetchHistory(conversationId, { oldest: cursor });
                    if (messages.length === 0) {
                      return { added: 0 };
                    }

                    const userById = yield* resolveUsers(messages);
                    const botById = yield* resolveBots(messages);

                    // Slack returns history newest-first; reverse so feed
                    // append order matches chronological order.
                    const sorted = [...messages].sort((a, b) => Number(a.ts) - Number(b.ts));
                    const mapped = sorted
                      .map((message) => mapSlackMessage(message, userById, botById))
                      .filter((message): message is Message.Message => message !== undefined);

                    if (mapped.length === 0) {
                      return { added: 0 };
                    }

                    yield* Database.load(targetChannel.backend.config);
                    const feed = Channel.getFeed(targetChannel);
                    invariant(feed, 'Channel is not feed-backed');
                    yield* Feed.append(feed, mapped);

                    const newestTs = sorted[sorted.length - 1].ts;
                    Obj.update(integrationObj, (integrationObj) => {
                      const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                      const idx = mutable.targets.findIndex((entry) => entry.remoteId === conversationId);
                      if (idx >= 0) {
                        mutable.targets[idx] = { ...mutable.targets[idx], cursor: newestTs };
                      }
                    });

                    // Mirror the conversation's display name onto the local
                    // Channel if we just learned a better one (first sync, or
                    // the channel was renamed remotely).
                    const desiredName = friendlyChannelName(conversation);
                    if (targetChannel.name !== desiredName) {
                      Obj.update(targetChannel, (targetChannel) => {
                        (targetChannel as Obj.Mutable<typeof targetChannel>).name = desiredName;
                      });
                    }

                    return { added: mapped.length };
                  }),
                );

                Obj.update(integrationObj, (integrationObj) => {
                  const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                  const idx = mutable.targets.findIndex((entry) => {
                    if (entry.remoteId !== undefined) {
                      return entry.remoteId === conversationId;
                    }
                    const localId = entry.object?.target
                      ? Obj.getMeta(entry.object.target).keys.find((key) => key.source === SLACK_SOURCE)?.id
                      : undefined;
                    return localId === conversationId;
                  });
                  if (idx < 0) {
                    return;
                  }
                  if (result._tag === 'Right') {
                    mutable.targets[idx] = {
                      ...mutable.targets[idx],
                      lastSyncAt: new Date().toISOString(),
                      lastError: undefined,
                    };
                  } else {
                    mutable.targets[idx] = {
                      ...mutable.targets[idx],
                      lastError: formatSlackSyncFailure(result.left),
                    };
                  }
                });

                return result._tag === 'Right' ? result.right : undefined;
              }),
            { concurrency: TARGET_CONCURRENCY },
          );

          let pulled: PullResult = { added: 0 };
          for (const result of perTarget) {
            if (!result) {
              continue;
            }
            pulled = { added: pulled.added + result.added };
          }
          return { pulled };
        }).pipe(
          Effect.provide(Database.layer(db)),
          Effect.provide(createFeedServiceLayer(space.queues)),
          Effect.provide(SlackApi.SlackCredentials.fromIntegration(integration)),
        ),
      );

      if (outcome._tag === 'Right') {
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}.sync-success.${toastIdSuffix}`,
            icon: 'ph--check--regular',
            title: ['sync-toast.success.label', { ns: meta.id }],
          }),
        );
        return outcome.right;
      } else {
        const message = formatSlackSyncFailure(outcome.left);
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}.sync-error.${toastIdSuffix}`,
            icon: 'ph--warning--regular',
            title: ['sync-toast.error.label', { ns: meta.id }],
            description: message,
          }),
        );
        return yield* Effect.fail(outcome.left);
      }
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
