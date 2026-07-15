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

/** Hard cap on `maxDays` so a misconfigured value can't kick off a rate-limit-thrashing backfill. */
const MAX_DAYS = 365 * 3;

const MESSAGE_PAGE_LIMIT = 100;

/**
 * Computes the initial sync cursor. An existing `cursor` (previous sync's newest id) is used verbatim;
 * on first sync, derives a snowflake from "now minus `maxDays`" (clamped, default 30). `maxDays` is only
 * consulted while `cursor` is unset.
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
 * - `created` from Discord's ISO `timestamp` (already ISO-8601).
 * - `sender.name` prefers `global_name`, falls back to `username`; bots carry the same fields.
 * - `threadId` from `referenced_message.id` so replies reconstruct on read (mirrors Slack's `thread_ts`).
 * - `blocks` is a single `Text` block; Discord's rich-embed shape is not mapped yet.
 *
 * Returns `undefined` for non-default messages (joins, pins, ...) so the feed isn't polluted.
 */
const mapDiscordMessage = (message: MessageResponse): Message.Message | undefined => {
  // Discord message type 0 is DEFAULT; 19 is REPLY (still a real chat message).
  const type = message.type ?? 0;
  if (type !== 0 && type !== 19) {
    return undefined;
  }
  const text = message.content;
  const blocks: ContentBlock.Any[] = text.length > 0 ? [{ _tag: 'text', text } as ContentBlock.Text] : [];

  // For replies, prefer `referenced_message.id`, fall back to `message_reference.message_id` — Discord
  // omits the former when the parent is deleted.
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

/** Finds an existing Channel whose foreign key matches the given Discord channel id. */
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
 * Reconciles messages for the Discord channel bound by a {@link Cursor.Cursor} (pull-only): fetch
 * messages with id greater than `binding.max` (or from "now minus maxDays" on first sync), map to
 * `@dxos/types` Messages, append to the channel's feed, and advance the cursor via `Cursor.advance`/
 * `Cursor.recordError` so the next sync is incremental.
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

        // Resolve the binding's endpoints up front: source access token → credential, target Channel,
        // and `externalId` (the Discord channel to pull).
        const binding = yield* Database.load(bindingRef).pipe(Effect.provide(Database.layer(db)));
        invariant(Cursor.isExternal(binding), 'Cursor is missing an external-sync spec for Discord channel.');
        const accessToken = yield* Database.load(binding.spec.source).pipe(Effect.provide(Database.layer(db)));
        const localRoot = yield* Database.load(binding.spec.target).pipe(Effect.provide(Database.layer(db)));
        const externalId = binding.spec.externalId;
        invariant(externalId, 'Cursor is missing an externalId for Discord channel.');
        invariant(Channel.instanceOf(localRoot), 'Cursor target is not a Channel.');

        // Captured on the success path so the cursor's max + run status advance in one atomic update.
        let newestId: string | undefined;
        const outcome = yield* Effect.either(
          Effect.gen(function* () {
            const rest = yield* DiscordREST;

            const initialAfter = computeInitialCursor(binding.max, binding.spec.options);

            // Drain pagination. Discord returns newest-first even when paging by `after`; sort each page
            // ascending so the list is chronological and the persisted cursor is the largest id seen.
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
