//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import type { GuildChannelResponse, MessageResponse, MyGuildResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Channel, ContentBlock, Message } from '@dxos/types';

import { meta } from '#meta';

import { DEFAULT_DAYS_OF_HISTORY, DISCORD_SOURCE, snowflakeForTimestamp } from '../constants';
import { formatDiscordSyncFailure } from '../errors';
import { makeDiscordLayer } from '../services';
import { DiscordOperation } from '../types';

/**
 * Hard cap on `daysOfHistory` to keep a misconfigured (or fat-fingered) value
 * from kicking off a 10-year backfill that thrashes the rate limit. ~3 years
 * is enough for any realistic "I want context" scenario.
 */
const MAX_DAYS_OF_HISTORY = 365 * 3;

const GUILD_PAGE_LIMIT = 200;
const MESSAGE_PAGE_LIMIT = 100;

/**
 * Compute the initial sync cursor for a Discord channel.
 *
 * - If we already have a `cursor` (newest message id from the previous sync),
 *   use it verbatim — every subsequent sync is incremental.
 * - On first sync, derive a snowflake from "now minus N days" where N comes
 *   from the user-provided `daysOfHistory` option (clamped to a sane range,
 *   default 30).
 *
 * The user can sync more history by re-creating the target with a larger
 * `daysOfHistory` value, since the option is only consulted while `cursor`
 * is unset.
 */
const computeInitialCursor = (cursor: string | undefined, options: { daysOfHistory?: number } | undefined): string => {
  if (cursor) {
    return cursor;
  }
  const raw = options?.daysOfHistory;
  const days = typeof raw === 'number' && raw > 0 ? Math.min(raw, MAX_DAYS_OF_HISTORY) : DEFAULT_DAYS_OF_HISTORY;
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

const friendlyChannelName = (channel: GuildChannelResponse, guildName?: string): string => {
  const base = channel.name ? `#${channel.name}` : channel.id;
  return guildName ? `${base} — ${guildName}` : base;
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
 * Finds an existing Channel for a Discord channel, or creates a fresh one
 * (with the foreign key set and a backing feed). Idempotent: re-running on
 * the same `(space, channel)` returns the same Channel.
 */
export const findOrCreateChannelForDiscordChannel: (
  channel: GuildChannelResponse,
  guildName?: string,
) => Effect.Effect<Channel.Channel, never, Database.Service> = Effect.fn('findOrCreateChannelForDiscordChannel')(
  function* (channel, guildName) {
    const existing = yield* findChannelForDiscordChannel(channel.id);
    if (existing) {
      return existing;
    }
    const obj = Channel.make({
      [Obj.Meta]: { keys: [{ source: DISCORD_SOURCE, id: channel.id }] },
      name: friendlyChannelName(channel, guildName),
    });
    return yield* Database.add(obj);
  },
);

const TARGET_CONCURRENCY = 3;

/**
 * Locate the targets-array index for a Discord channel id, supporting both
 * shapes the Integration carries:
 *  - new entries: `entry.remoteId` is the Discord channel id directly.
 *  - legacy entries: `entry.remoteId` is undefined, and the Discord id lives
 *    on the local Channel's foreign-key metadata via `entry.object.target`.
 *
 * The two reads/writes that touch a target's `cursor` and `lastError` MUST
 * use this lookup; matching `remoteId` only quietly skips legacy entries so
 * the cursor never advances and the error never surfaces.
 */
const findTargetIndex = (
  targets: ReadonlyArray<{
    readonly remoteId?: string;
    readonly object?: { readonly target?: unknown };
  }>,
  discordChannelId: string,
): number =>
  targets.findIndex((entry) => {
    if (entry.remoteId !== undefined) {
      return entry.remoteId === discordChannelId;
    }
    const localTarget = entry.object?.target as Parameters<typeof Obj.getMeta>[0] | undefined;
    if (!localTarget) {
      return false;
    }
    return Obj.getMeta(localTarget).keys.some((key) => key.source === DISCORD_SOURCE && key.id === discordChannelId);
  });

/**
 * Reconciles messages for currently-selected Discord targets on the Integration.
 *
 * Pull-only. Per target:
 *  1. Resolve (or materialize) the local Channel keyed by the Discord channel id.
 *  2. Ask Discord for messages with id greater than `target.cursor` (or from
 *     "now minus daysOfHistory" on first sync).
 *  3. Map each Discord message → `@dxos/types` Message and append the batch to
 *     the channel's feed.
 *  4. Update `target.cursor` to the largest id seen so the next sync is incremental.
 *
 * Failure on one target writes `lastError` on that target only and continues
 * with the next; targets are processed in parallel up to `TARGET_CONCURRENCY`.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.SyncDiscordChannel> =
  DiscordOperation.SyncDiscordChannel.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ integration, channel: channelRef }) {
        const integrationTarget = integration.target;
        const db = integrationTarget ? Obj.getDatabase(integrationTarget) : undefined;
        invariant(db, 'No database for integration ref — invoker did not provide Database.layer.');

        const client = yield* Capability.get(ClientCapabilities.Client);
        const space = client.spaces.get(db.spaceId);
        invariant(space, 'Space not found');

        const integrationId = EID.getEntityId(EID.parse(integration.uri)) ?? 'unknown';
        const toastIdSuffix = channelRef
          ? `${integrationId}.${EID.getEntityId(EID.parse(channelRef.uri)) ?? 'unknown'}`
          : integrationId;

        const outcome = yield* Effect.either(
          Effect.gen(function* () {
            const integrationObj = yield* Database.load(integration);
            const rest = yield* DiscordREST;

            // Drain guild pagination up front so we can resolve every selected
            // target id without per-target round-trips.
            const guilds: MyGuildResponse[] = [];
            {
              let after: string | undefined;
              while (true) {
                const page = yield* rest.listMyGuilds(
                  after ? { limit: GUILD_PAGE_LIMIT, after } : { limit: GUILD_PAGE_LIMIT },
                );
                guilds.push(...page);
                if (page.length < GUILD_PAGE_LIMIT) {
                  break;
                }
                after = page[page.length - 1].id;
              }
            }
            const guildById = new Map(guilds.map((guild) => [guild.id, guild]));
            // Channel-discovery errors are tracked per guild so any selected
            // target in a guild we couldn't list still surfaces a `lastError`
            // instead of silently becoming a no-op for the whole sync run.
            const guildErrorById = new Map<string, unknown>();
            const channelsByGuild = yield* Effect.forEach(
              guilds,
              (guild) =>
                rest.listGuildChannels(guild.id).pipe(
                  // Same narrow as get-discord-channels: text + announcement
                  // are the only shapes we sync, and they're the only types
                  // present on the GuildChannelResponse branch we want here.
                  Effect.map(
                    (channels) =>
                      [
                        guild.id,
                        channels.filter(
                          (channel): channel is GuildChannelResponse => channel.type === 0 || channel.type === 5,
                        ),
                      ] as const,
                  ),
                  Effect.catchAll((error) => {
                    guildErrorById.set(guild.id, error);
                    return Effect.succeed([guild.id, [] as ReadonlyArray<GuildChannelResponse>] as const);
                  }),
                ),
              { concurrency: 4 },
            );
            const channelById = new Map<string, { channel: GuildChannelResponse; guildId: string }>();
            for (const [guildId, channels] of channelsByGuild) {
              for (const channel of channels) {
                channelById.set(channel.id, { channel, guildId });
              }
            }

            const channelFilterId = channelRef ? EID.getEntityId(EID.parse(channelRef.uri)) : undefined;
            type TargetEntry = {
              entry: (typeof integrationObj.targets)[number];
              channel: Channel.Channel;
              discordChannelId: string;
              discordChannel: GuildChannelResponse;
              guildName: string | undefined;
            };
            const targetEntries: TargetEntry[] = [];
            for (const target of integrationObj.targets) {
              let foreignId = target.remoteId;
              let localObj = target.object?.target;
              if (foreignId === undefined && localObj) {
                foreignId = Obj.getMeta(localObj).keys.find((key) => key.source === DISCORD_SOURCE)?.id;
              }
              if (foreignId === undefined) {
                continue;
              }
              const discord = channelById.get(foreignId);
              if (!discord) {
                // Target's guild errored during discovery, or the channel is no
                // longer reachable (bot removed, channel deleted). Record a
                // `lastError` instead of dropping the target — otherwise the
                // sync looks successful while some selected channels were never
                // attempted.
                const channelIdForError = foreignId;
                const firstGuildError = guildErrorById.values().next().value;
                const errorMessage =
                  firstGuildError !== undefined
                    ? formatDiscordSyncFailure(firstGuildError)
                    : `Discord channel ${channelIdForError} is not reachable (bot removed or channel deleted).`;
                Obj.update(integrationObj, (integrationObj) => {
                  const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                  const idx = findTargetIndex(mutable.targets, channelIdForError);
                  if (idx >= 0) {
                    mutable.targets[idx] = { ...mutable.targets[idx], lastError: errorMessage };
                  }
                });
                continue;
              }
              const guildName = guildById.get(discord.guildId)?.name;
              if (!localObj) {
                localObj = yield* findOrCreateChannelForDiscordChannel(discord.channel, guildName);
                const materializedRef = Ref.make(localObj);
                Obj.update(integrationObj, (integrationObj) => {
                  const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                  const idx = findTargetIndex(mutable.targets, foreignId);
                  if (idx >= 0) {
                    mutable.targets[idx] = { ...mutable.targets[idx], object: materializedRef };
                  }
                });
              }

              const targetEchoId = EID.getEntityId(EID.parse(Obj.getURI(localObj)));
              if (channelFilterId && targetEchoId !== channelFilterId) {
                continue;
              }
              if (!Channel.instanceOf(localObj)) {
                continue;
              }

              targetEntries.push({
                entry: target,
                channel: localObj,
                discordChannelId: foreignId,
                discordChannel: discord.channel,
                guildName,
              });
            }

            const perTarget = yield* Effect.forEach(
              targetEntries,
              ({ channel: targetChannel, discordChannelId, discordChannel, guildName }) =>
                Effect.gen(function* () {
                  const result = yield* Effect.either(
                    Effect.gen(function* () {
                      const targetIdx = findTargetIndex(integrationObj.targets, discordChannelId);
                      const targetEntry = targetIdx >= 0 ? integrationObj.targets[targetIdx] : undefined;
                      const initialAfter = computeInitialCursor(
                        targetEntry?.cursor,
                        targetEntry?.options as { daysOfHistory?: number } | undefined,
                      );

                      // Drain message pagination. Discord returns newest-first
                      // within a page even when paging by `after`; sort each
                      // page ascending so the final list is chronological and
                      // the cursor we persist is the largest id seen.
                      const messages: MessageResponse[] = [];
                      let after = initialAfter;
                      while (true) {
                        const page = yield* rest.listMessages(discordChannelId, { after, limit: MESSAGE_PAGE_LIMIT });
                        if (page.length === 0) {
                          break;
                        }
                        const sorted = [...page].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
                        messages.push(...sorted);
                        if (sorted.length < MESSAGE_PAGE_LIMIT) {
                          break;
                        }
                        after = sorted[sorted.length - 1].id;
                      }

                      if (messages.length === 0) {
                        return { added: 0 };
                      }

                      const mapped = messages
                        .map(mapDiscordMessage)
                        .filter((message): message is Message.Message => message !== undefined);

                      if (mapped.length === 0) {
                        return { added: 0 };
                      }

                      yield* Database.load(targetChannel.backend.config);
                      const feed = Channel.getFeed(targetChannel);
                      invariant(feed, 'Channel is not feed-backed');
                      yield* Feed.append(feed, mapped);

                      const newestId = messages[messages.length - 1].id;
                      Obj.update(integrationObj, (integrationObj) => {
                        const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                        const idx = findTargetIndex(mutable.targets, discordChannelId);
                        if (idx >= 0) {
                          mutable.targets[idx] = { ...mutable.targets[idx], cursor: newestId };
                        }
                      });

                      // Mirror the channel's display name onto the local Channel
                      // if we just learned a better one (first sync, or channel
                      // renamed remotely).
                      const desiredName = friendlyChannelName(discordChannel, guildName);
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
                    const idx = findTargetIndex(mutable.targets, discordChannelId);
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
                        lastError: formatDiscordSyncFailure(result.left),
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
          }).pipe(Effect.provide(Database.layer(db)), Effect.provide(makeDiscordLayer(integration))),
        );

        if (outcome._tag === 'Right') {
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
