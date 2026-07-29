//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import type { MessageResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { Cursor } from '@dxos/link';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Channel, ContentBlock, Message } from '@dxos/types';

import { meta } from '#meta';

import { DEFAULT_DAYS, DISCORD_SOURCE, snowflakeForTimestamp } from '../constants';
import { formatDiscordSyncFailure } from '../errors';
import { makeDiscordLayerFromToken } from '../services';
import { DiscordOperation } from '../types';

/**
 * Hard cap on `maxDays` to keep a misconfigured (or fat-fingered) value
 * from kicking off a 10-year backfill that thrashes the rate limit. ~3 years
 * is enough for any realistic "I want context" scenario.
 */
const MAX_DAYS = 365 * 3;

const MESSAGE_PAGE_LIMIT = 100;

/**
 * Compute the initial sync cursor for a Discord channel.
 *
 * - If we already have a `cursor` (newest message id from the previous sync),
 *   use it verbatim — every subsequent sync is incremental.
 * - On first sync, derive a snowflake from "now minus N days" where N comes
 *   from the user-provided `maxDays` option (clamped to a sane range,
 *   default 30).
 *
 * The user can sync more history by re-creating the binding with a larger
 * `maxDays` value, since the option is only consulted while `cursor`
 * is unset.
 */
const computeInitialCursor = (cursor: string | undefined, options: Record<string, unknown> | undefined): string => {
  if (cursor) {
    return cursor;
  }
  const raw = options?.maxDays;
  const days = typeof raw === 'number' && raw > 0 ? Math.min(raw, MAX_DAYS) : DEFAULT_DAYS;
  return snowflakeForTimestamp(Date.now() - days * 24 * 60 * 60 * 1000);
};

/** Pull reconcile result. */
export type PullResult = {
  added: number;
};

/**
 * Maps a Discord message into a `@dxos/types` Message.
 *
 * - `created` from Discord's ISO `timestamp` (no conversion needed; Discord
 *   already serializes as ISO-8601).
 * - `sender.name` prefers `global_name` (Discord's display name, post 2023
 *   username overhaul) and falls back to `username`. Bot-posted messages
 *   carry the same fields so the bot's friendly name surfaces without a
 *   special-case lookup.
 * - `threadId` carries `referenced_message.id` for in-channel replies so the
 *   client can reconstruct reply chains on read without a separate object
 *   type — mirrors the Slack mapping which uses `thread_ts`.
 * - `blocks` is a single `Text` block from `content`. Discord's rich-embed
 *   shape (embeds, attachments, components) is NOT mapped yet — that would
 *   need a Discord-embed → ContentBlock translator that's a separate piece
 *   of work.
 *
 * Returns `undefined` for non-default messages (joins, pins, calls, ...) so
 * the chronological feed isn't polluted with system notices.
 */
const mapDiscordMessage = (message: MessageResponse): Message.Message | undefined => {
  // Discord message type 0 is DEFAULT; 19 is REPLY (still a real chat message).
  const type = message.type ?? 0;
  if (type !== 0 && type !== 19) {
    return undefined;
  }
  const text = message.content;
  const blocks: ContentBlock.Any[] = text.length > 0 ? [{ _tag: 'text', text } as ContentBlock.Text] : [];

  // For replies (type 19), prefer `referenced_message.id`, but fall back to
  // `message_reference.message_id` — Discord omits `referenced_message` when
  // the parent has been deleted, while `message_reference` still carries the id.
  const referenced =
    message.type === 19
      ? (message.referenced_message?.id ?? message.message_reference?.message_id)
      : message.referenced_message?.id;

  const senderName =
    (message.author.global_name && message.author.global_name.length > 0 ? message.author.global_name : undefined) ??
    message.author.username;

  return Message.make({
    [Obj.Meta]: { keys: [{ source: DISCORD_SOURCE, id: message.id }] },
    created: message.timestamp,
    threadId: referenced,
    sender: {
      role: 'user',
      name: senderName,
    },
    blocks,
  });
};

/**
 * Finds an existing Channel whose foreign key matches the given Discord channel id.
 */
export const findChannelForDiscordChannel: (
  discordChannelId: string,
) => Effect.Effect<Channel.Channel | undefined, never, Database.Service> = Effect.fn('findChannelForDiscordChannel')(
  function* (discordChannelId) {
    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Channel.Channel, [{ source: DISCORD_SOURCE, id: discordChannelId }])),
    ).run;
    return existing.length > 0 ? (existing[0] as Channel.Channel) : undefined;
  },
);

/**
 * Reconciles messages for the single Discord channel bound by a {@link Cursor.Cursor}.
 *
 * Pull-only:
 *  1. Load the binding; its source is the `AccessToken`, its target the
 *     local `Channel`, and `binding.spec.externalId` is the Discord channel id.
 *  2. Ask Discord for messages with id greater than `binding.max` (or from
 *     "now minus maxDays" on first sync).
 *  3. Map each Discord message → `@dxos/types` Message and append the batch to
 *     the channel's feed.
 *  4. Advance `binding.max` to the largest id seen so the next sync is incremental.
 *
 * Success/failure status is written back onto the binding via `Cursor.advance`/
 * `Cursor.recordError` (`value`/`lastTick`/`lastError`).
 */
const handler: Operation.WithHandler<typeof DiscordOperation.SyncDiscordChannel> =
  DiscordOperation.SyncDiscordChannel.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ binding: bindingRef }) {
        const bindingTarget = bindingRef.target;
        const db = bindingTarget ? Obj.getDatabase(bindingTarget) : undefined;
        invariant(db, 'No database for binding ref — invoker did not provide Database.layer.');

        const client = yield* Capability.get(ClientCapabilities.Client);
        const space = client.spaces.get(db.spaceId);
        invariant(space, 'Space not found');

        const toastIdSuffix = EID.getEntityId(EID.parse(bindingRef.uri)) ?? 'unknown';

        // Resolve the binding's endpoints up front: the source access token
        // supplies the credential for the Discord layer, the target is the
        // local Channel, and `externalId` is the Discord channel id to pull.
        const binding = yield* Database.load(bindingRef).pipe(Effect.provide(Database.layer(db)));
        invariant(Cursor.isExternal(binding), 'Cursor is missing an external-sync spec for Discord channel.');
        const accessToken = yield* Database.load(binding.spec.source).pipe(Effect.provide(Database.layer(db)));
        const localRoot = yield* Database.load(binding.spec.target).pipe(Effect.provide(Database.layer(db)));
        const externalId = binding.spec.externalId;
        invariant(externalId, 'Cursor is missing an externalId for Discord channel.');
        invariant(Channel.instanceOf(localRoot), 'Cursor target is not a Channel.');

        // Captured on the success path so the cursor's value + run status advance in one atomic update.
        let newestId: string | undefined;
        const outcome = yield* Effect.either(
          Effect.gen(function* () {
            const rest = yield* DiscordREST;

            const initialAfter = computeInitialCursor(binding.max, binding.spec.options);

            // Drain message pagination. Discord returns newest-first within a
            // page even when paging by `after`; sort each page ascending so the
            // final list is chronological and the cursor we persist is the
            // largest id seen.
            const messages: MessageResponse[] = [];
            let after = initialAfter;
            while (true) {
              const page = yield* rest.listMessages(externalId, { after, limit: MESSAGE_PAGE_LIMIT });
              if (page.length === 0) {
                break;
              }
              const sorted = [...page].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
              messages.push(...sorted);
              if (sorted.length < MESSAGE_PAGE_LIMIT) {
                break;
              }
              after = sorted[sorted.length - 1].id;
            }

            if (messages.length === 0) {
              return { pulled: { added: 0 } };
            }

            const mapped = messages
              .map(mapDiscordMessage)
              .filter((message): message is Message.Message => message !== undefined);

            if (mapped.length === 0) {
              return { pulled: { added: 0 } };
            }

            yield* Database.load(localRoot.backend.config);
            const feed = Channel.getFeed(localRoot);
            invariant(feed, 'Channel is not feed-backed');
            yield* Feed.append(feed, mapped);

            newestId = messages[messages.length - 1].id;

            return { pulled: { added: mapped.length } };
          }).pipe(Effect.provide(Database.layer(db)), Effect.provide(makeDiscordLayerFromToken(accessToken.token))),
        );

        if (outcome._tag === 'Right') {
          Cursor.advance(binding, newestId);
          yield* Effect.ignore(
            Operation.invoke(LayoutOperation.AddToast, {
              id: `${meta.profile.key}.sync-success.${toastIdSuffix}`,
              icon: 'ph--check--regular',
              title: ['sync-toast.success.label', { ns: meta.profile.key }],
            }),
          );
          return outcome.right;
        } else {
          const message = formatDiscordSyncFailure(outcome.left);
          Cursor.recordError(binding, message);
          yield* Effect.ignore(
            Operation.invoke(LayoutOperation.AddToast, {
              id: `${meta.profile.key}.sync-error.${toastIdSuffix}`,
              icon: 'ph--warning--regular',
              title: ['sync-toast.error.label', { ns: meta.profile.key }],
              description: message,
            }),
          );
          return yield* Effect.fail(outcome.left);
        }
      }),
    ),
  );

export default handler;
