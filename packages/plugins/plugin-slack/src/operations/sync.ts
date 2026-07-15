//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation, SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Channel, ContentBlock, Message } from '@dxos/types';

import { meta } from '#meta';

import { SLACK_SOURCE } from '../constants';
import { formatSlackSyncFailure } from '../errors';
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
 * Finds an existing Channel for a Slack conversation id, or creates a fresh
 * empty one (with the foreign key set and a backing feed). Idempotent:
 * re-running on the same `(space, conversationId)` returns the same Channel.
 *
 * Used by the connector's `materializeTarget` to create the local root eagerly
 * when a binding is created, so the `Cursor`'s `spec.target` has somewhere to point.
 */
export const findOrCreateChannelForTarget: (input: {
  externalId: string;
  name?: string;
}) => Effect.Effect<Channel.Channel, never, Database.Service> = Effect.fn('findOrCreateChannelForTarget')(function* ({
  externalId,
  name,
}) {
  const existing = yield* findChannelForConversation(externalId);
  if (existing) {
    return existing;
  }
  const channel = Channel.make({
    [Obj.Meta]: { keys: [{ source: SLACK_SOURCE, id: externalId }] },
    name: name ?? externalId,
  });
  return yield* Database.add(channel);
});

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

/**
 * Reconciles messages for a single Slack channel binding.
 *
 * Pull-only:
 *  1. Resolve the binding's credential (`spec.source`) and local Channel (`spec.target`).
 *  2. Ask Slack for messages since the binding's `max` (or all history on first sync).
 *  3. Resolve referenced user / bot ids in one batch (cached per sync).
 *  4. Map each Slack message → `@dxos/types` Message and append the batch to
 *     the channel's feed.
 *  5. Write the newest `ts` seen back onto the binding's `max` so the next
 *     sync is incremental, plus `lastTick` / `lastError`.
 *
 * `Database.Service` is provided inside the handler.
 * The binding ref carries the database; the space db is resolved via the
 * Client capability — same shape as `plugin-thread`'s `AppendChannelMessage`.
 */
const handler: Operation.WithHandler<typeof SlackOperation.SyncSlackChannel> = SlackOperation.SyncSlackChannel.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ binding: bindingRef }) {
      // TODO(wittjosiah): The operation should depend on `Database.Service` once
      //   the OperationInvoker has a `databaseResolver`. Until then we require
      //   the caller to preload `binding.target` so we can derive the db and
      //   resolve the cursor's credential.
      const bindingTarget = bindingRef.target;
      if (!bindingTarget) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }
      const db = Obj.getDatabase(bindingTarget);
      if (!db) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }
      // The integration mechanism only ever creates external-sync cursors for Slack.
      if (!Cursor.isExternal(bindingTarget)) {
        return { pulled: { added: 0 } satisfies PullResult };
      }

      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found');

      // The binding's `spec.source` is the AccessToken that authenticates the sync directly.
      const accessTokenRef = bindingTarget.spec.source;

      const bindingId = EID.getEntityId(EID.tryParse(bindingRef.uri)!) ?? 'unknown';

      const outcome = yield* Effect.either(
        Effect.gen(function* () {
          const binding = yield* Database.load(bindingRef);
          if (!Cursor.isExternal(binding)) {
            return { pulled: { added: 0 } satisfies PullResult };
          }
          const localRoot = yield* Database.load(binding.spec.target);

          // Resolve the remote conversation id: prefer the binding's `spec.externalId`,
          // fall back to the target Channel's Slack foreign key (legacy bindings).
          const externalId =
            binding.spec.externalId ?? Obj.getMeta(localRoot).keys.find((key) => key.source === SLACK_SOURCE)?.id;

          // Captured on the success path so the cursor's max + run status advance in one atomic update.
          let newestTs: string | undefined;
          const syncResult = yield* Effect.either(
            Effect.gen(function* () {
              if (externalId === undefined) {
                return { added: 0 } satisfies PullResult;
              }
              if (!Channel.instanceOf(localRoot)) {
                return { added: 0 } satisfies PullResult;
              }
              const targetChannel = localRoot;

              // One round-trip to fetch the conversation metadata so we can
              // mirror a friendly name onto the local Channel.
              const allConversations = yield* SlackApi.fetchConversations();
              const conversation = allConversations.find((conv) => conv.id === externalId);

              const messages = yield* SlackApi.fetchHistory(externalId, { oldest: binding.max });
              if (messages.length === 0) {
                return { added: 0 } satisfies PullResult;
              }

              const userById = yield* resolveUsers(messages);
              const botById = yield* resolveBots(messages);

              // Slack returns history newest-first; reverse so feed append order
              // matches chronological order.
              const sorted = [...messages].sort((messageA, messageB) => Number(messageA.ts) - Number(messageB.ts));
              const mapped = sorted
                .map((message) => mapSlackMessage(message, userById, botById))
                .filter((message): message is Message.Message => message !== undefined);

              if (mapped.length === 0) {
                return { added: 0 } satisfies PullResult;
              }

              yield* Database.load(targetChannel.backend.config);
              const feed = Channel.getFeed(targetChannel);
              invariant(feed, 'Channel is not feed-backed');
              yield* Feed.append(feed, mapped);

              // Capture the newest `ts` seen; the cursor advances (max + status) after the sync
              // succeeds so the next sync is incremental.
              newestTs = sorted[sorted.length - 1].ts;

              // Mirror the conversation's display name onto the local Channel if
              // we just learned a better one (first sync, or renamed remotely).
              if (conversation) {
                const desiredName = friendlyChannelName(conversation);
                if (targetChannel.name !== desiredName) {
                  Obj.update(targetChannel, (targetChannel) => {
                    targetChannel.name = desiredName;
                  });
                }
              }

              return { added: mapped.length } satisfies PullResult;
            }),
          );

          // Record per-binding sync status directly on the cursor (max + status in one atomic update).
          if (syncResult._tag === 'Right') {
            Cursor.advance(binding, newestTs);
          } else {
            Cursor.recordError(binding, formatSlackSyncFailure(syncResult.left));
          }

          if (syncResult._tag === 'Left') {
            log.warn('slack sync: binding failed', { error: syncResult.left });
            return yield* Effect.fail(syncResult.left);
          }

          return { pulled: syncResult.right };
        }).pipe(
          Effect.provide(Database.layer(db)),
          Effect.provide(SlackApi.SlackCredentials.fromAccessToken(accessTokenRef)),
        ),
      );

      if (outcome._tag === 'Right') {
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.profile.key}.sync-success.${bindingId}`,
            icon: 'ph--check--regular',
            title: ['sync-toast.success.label', { ns: meta.profile.key }],
          }),
        );
        return outcome.right;
      } else {
        const message = formatSlackSyncFailure(outcome.left);
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.profile.key}.sync-error.${bindingId}`,
            icon: 'ph--warning--regular',
            title: ['sync-toast.error.label', { ns: meta.profile.key }],
            description: message,
          }),
        );
        return yield* Effect.fail(outcome.left);
      }
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
