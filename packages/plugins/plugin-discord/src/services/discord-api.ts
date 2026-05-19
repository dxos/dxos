//
// Copyright 2026 DXOS.org
//

import * as PlatformHeaders from '@effect/platform/Headers';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ParseResult from 'effect/ParseResult';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { Database, type Ref } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration';

import { DISCORD_API_BASE } from '../constants';
import { DiscordApiError } from '../errors';

/** Discord bot bearer credentials (the `Bot <token>` Authorization header value). */
type DiscordCredentialsValue = {
  token: string;
};

const DiscordUserSchema = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.String.pipe(Schema.NullOr, Schema.optional),
  discriminator: Schema.String.pipe(Schema.optional),
  bot: Schema.Boolean.pipe(Schema.optional),
});

export type DiscordUser = Schema.Schema.Type<typeof DiscordUserSchema>;

const DiscordGuildSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.String.pipe(Schema.NullOr, Schema.optional),
});

export type DiscordGuild = Schema.Schema.Type<typeof DiscordGuildSchema>;

/**
 * Subset of a Discord channel. We accept any numeric `type` and let callers
 * filter — Discord's channel-type enum is large (text, voice, thread, forum,
 * stage, ...) and only a subset is sync-relevant. `type === 0` is a normal
 * text channel; `type === 5` is an announcement channel.
 */
const DiscordChannelSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Number,
  name: Schema.String.pipe(Schema.NullOr, Schema.optional),
  topic: Schema.String.pipe(Schema.NullOr, Schema.optional),
  guild_id: Schema.String.pipe(Schema.optional),
  parent_id: Schema.String.pipe(Schema.NullOr, Schema.optional),
  position: Schema.Number.pipe(Schema.optional),
  nsfw: Schema.Boolean.pipe(Schema.optional),
});

export type DiscordChannel = Schema.Schema.Type<typeof DiscordChannelSchema>;

/** Channel types we treat as message-bearing channels for sync. */
export const SYNCABLE_CHANNEL_TYPES = new Set<number>([
  0, // GUILD_TEXT
  5, // GUILD_ANNOUNCEMENT
]);

const DiscordMessageAuthorSchema = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.String.pipe(Schema.NullOr, Schema.optional),
  bot: Schema.Boolean.pipe(Schema.optional),
});

const DiscordMessageSchema = Schema.Struct({
  id: Schema.String,
  /** ISO-8601 timestamp string. */
  timestamp: Schema.String,
  edited_timestamp: Schema.String.pipe(Schema.NullOr, Schema.optional),
  channel_id: Schema.String,
  content: Schema.String,
  author: DiscordMessageAuthorSchema,
  /** `0` is `DEFAULT`; non-default subtypes (joins, pins, calls) are filtered on map. */
  type: Schema.Number.pipe(Schema.optional),
  /** Present on threaded replies; references the parent message. */
  referenced_message: Schema.Unknown.pipe(Schema.optional),
});

export type DiscordMessage = Schema.Schema.Type<typeof DiscordMessageSchema>;

const DiscordErrorBodySchema = Schema.Struct({
  code: Schema.Number.pipe(Schema.optional),
  message: Schema.String.pipe(Schema.optional),
});

/**
 * Layer-based credentials service. Mirrors the `SlackCredentials` /
 * `TrelloCredentials` patterns: every API call pulls creds from this service
 * rather than threading them through, so callers compose
 * `Effect.provide(DiscordApi.DiscordCredentials.fromIntegration(ref))` once at
 * the operation boundary.
 */
export class DiscordCredentials extends Context.Tag('@dxos/plugin-discord/DiscordCredentials')<
  DiscordCredentials,
  DiscordCredentialsValue
>() {
  static fromIntegration = (integrationRef: Ref.Ref<Integration.Integration>) =>
    Layer.effect(
      DiscordCredentials,
      Effect.gen(function* () {
        const integration = yield* Database.load(integrationRef);
        const accessToken = yield* Database.load(integration.accessToken);
        return { token: accessToken.token };
      }),
    );
}

type DiscordEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException | DiscordApiError,
  HttpClient.HttpClient | DiscordCredentials
>;

/**
 * Retry policy for Discord requests:
 *  - Transport / encode / invalid-URL failures: yes (transient by nature).
 *  - 429 (rate limited) and 5xx: yes — Discord's `X-RateLimit-Reset-After` /
 *    `Retry-After` header would let us back off precisely, but exponential
 *    jittered backoff is a reasonable default until we wire that up.
 *  - 4xx other than 429: no — auth / validation / not-found won't recover.
 *  - TimeoutException: yes.
 *  - Schema decode failures (`ParseError`): no — payload won't become valid on retry.
 *  - DiscordApiError: no — we only construct this for non-retryable codes.
 */
const shouldRetry = (
  error: HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException | DiscordApiError,
): boolean => {
  if (error instanceof ParseResult.ParseError) {
    return false;
  }
  if (DiscordApiError.is(error)) {
    // 429 — we already slept for `Retry-After` in `runRequest`; retry now.
    // Any other body-level Discord error (auth revoked, missing scope,
    // channel not found) won't recover on retry.
    return (error.context as { status?: number }).status === 429;
  }
  if (Cause.isTimeoutException(error)) {
    return true;
  }
  if (error._tag === 'RequestError') {
    return true;
  }
  if (error.reason !== 'StatusCode') {
    return true;
  }
  const status = error.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

/**
 * Common pipeline for Discord requests:
 *  - inject the bot token as `Authorization: Bot <token>` (Discord rejects the
 *    `Bearer` prefix used by Slack/Google; bot tokens always carry the `Bot ` prefix).
 *  - tracer disabled to keep `traceparent` out of headers — same CORS workaround
 *    as Slack / Trello / Google userinfo.
 *  - decode body with Effect Schema.
 *  - promote 4xx responses to a typed {@link DiscordApiError} carrying Discord's
 *    `{ code, message }` body so callers get a stable, user-facing failure mode.
 *  - 15s timeout, exponential jittered retry up to 3 attempts on transient failures only.
 */
/**
 * Parse Discord's rate-limit hint from response headers.
 *
 * Discord returns one of two headers on a 429 (and on near-limit 200s):
 *  - `Retry-After`: seconds (possibly fractional) the client must wait before retrying.
 *  - `X-RateLimit-Reset-After`: same shape, set on every rate-limited route response.
 *
 * Both are in seconds with optional fractional component. We add a small ceiling
 * (1s minimum, 30s cap) to absorb skew and to refuse to wait absurdly long on
 * a misconfigured upstream — Discord normally returns sub-second to ~5-second
 * windows for the routes we use, so a 30s cap still lets the genuine values
 * through unchanged.
 */
const parseRetryAfterMillis = (headers: PlatformHeaders.Headers): number => {
  const headerValue = (name: string): string | undefined => {
    const option = PlatformHeaders.get(headers, name);
    return option._tag === 'Some' ? option.value : undefined;
  };
  const raw = headerValue('retry-after') ?? headerValue('x-ratelimit-reset-after');
  const seconds = raw ? Number.parseFloat(raw) : Number.NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 1000;
  }
  return Math.min(Math.max(seconds * 1000, 1000), 30_000);
};

const runRequest = <T>(
  request: HttpClientRequest.HttpClientRequest,
  schema: Schema.Schema<T>,
): DiscordEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
    return yield* clientNoTracer.execute(request).pipe(
      Effect.flatMap((res): Effect.Effect<T, ParseResult.ParseError | DiscordApiError | HttpClientError.HttpClientError> => {
        if (res.status >= 200 && res.status < 300) {
          return Effect.flatMap(res.json, Schema.decodeUnknown(schema));
        }
        // On 429, honor Discord's `Retry-After` (or `X-RateLimit-Reset-After`)
        // before bubbling a retryable error. Generic exponential backoff
        // either over-waits or under-waits — the upstream tells us exactly
        // what window to respect, so we use it. The error still surfaces as
        // a DiscordApiError so `shouldRetry` triggers another attempt.
        if (res.status === 429) {
          const delayMillis = parseRetryAfterMillis(res.headers);
          return Effect.sleep(`${delayMillis} millis`).pipe(
            Effect.flatMap(() =>
              Effect.fail(
                new DiscordApiError({
                  context: { status: 429, code: undefined, message: `rate limited; waited ${delayMillis}ms` },
                }),
              ),
            ),
          );
        }
        const errorBody = res.json.pipe(
          Effect.flatMap(Schema.decodeUnknown(DiscordErrorBodySchema)),
          Effect.catchAll(() => Effect.succeed({ code: undefined, message: undefined })),
        );
        return Effect.flatMap(errorBody, (body) =>
          Effect.fail(
            new DiscordApiError({
              context: {
                status: res.status,
                code: typeof body.code === 'number' ? body.code : undefined,
                message: typeof body.message === 'string' ? body.message : undefined,
              },
            }),
          ),
        );
      }),
      Effect.timeout('30 seconds'),
      // Retries are mostly to recover from transient transport errors and
      // 5xx. 429 already had its mandatory wait above; this just gives it a
      // second pass through the same path. Cap at 5 attempts.
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(5))),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  });

const discordRequest = <T>(
  build: (creds: DiscordCredentialsValue) => HttpClientRequest.HttpClientRequest,
  schema: Schema.Schema<T>,
): DiscordEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* DiscordCredentials;
    return yield* runRequest(build(creds), schema);
  });

/**
 * Discord's REST docs say a valid bot User-Agent is required and the format is
 * `DiscordBot ($url, $versionNumber)`. Without it, requests to guild-scoped
 * endpoints intermittently 403 with the unhelpful `40333 internal network
 * error` code (other endpoints like `/users/@me/guilds` are more permissive,
 * which is why the bot identity / guild-list calls succeed without it but the
 * `/guilds/{id}/channels` lookup fails). Set it via the proxy's override
 * prefix because browsers refuse to let JS set `User-Agent` directly.
 */
const USER_AGENT_OVERRIDE_HEADER = 'X-Cors-Proxy-User-Agent';
const DISCORD_BOT_USER_AGENT = 'DiscordBot (https://dxos.org, 0.1.0)';

const authedGet = (creds: DiscordCredentialsValue, path: string, params: Record<string, string | number> = {}) =>
  HttpClientRequest.get(`${DISCORD_API_BASE}${path}`).pipe(
    HttpClientRequest.setHeader('Authorization', `Bot ${creds.token}`),
    HttpClientRequest.setHeader(USER_AGENT_OVERRIDE_HEADER, DISCORD_BOT_USER_AGENT),
    HttpClientRequest.setUrlParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))),
  );

/**
 * Returns the bot's own user record (`GET /users/@me`).
 *
 * Used by `onTokenCreated` to populate `accessToken.account` after the token
 * is supplied. Cheap and the only call that works against a freshly-pasted
 * bot token before the bot has been invited to any guild.
 */
export const fetchSelf = (): DiscordEffect<DiscordUser> =>
  discordRequest((creds) => authedGet(creds, '/users/@me'), DiscordUserSchema);

const DiscordGuildListSchema = Schema.Array(DiscordGuildSchema);
const DiscordChannelListSchema = Schema.Array(DiscordChannelSchema);
const DiscordMessageListSchema = Schema.Array(DiscordMessageSchema);

/**
 * Lists all guilds (servers) the bot is a member of (`GET /users/@me/guilds`).
 *
 * Bots are typically in a handful of guilds, so one page (default 200) is
 * usually enough; we drain pagination via `after` cursor for completeness.
 */
export const fetchGuilds = (): DiscordEffect<ReadonlyArray<DiscordGuild>> =>
  Effect.gen(function* () {
    const all: DiscordGuild[] = [];
    let after: string | undefined;
    do {
      const params: Record<string, string | number> = { limit: 200 };
      if (after) {
        params.after = after;
      }
      const page = yield* discordRequest((creds) => authedGet(creds, '/users/@me/guilds', params), DiscordGuildListSchema);
      all.push(...page);
      after = page.length === 200 ? page[page.length - 1].id : undefined;
    } while (after);
    return all;
  });

/**
 * Lists channels in a guild (`GET /guilds/{id}/channels`).
 *
 * Returns every channel type — callers filter by `SYNCABLE_CHANNEL_TYPES` to
 * keep only text-shaped channels.
 */
export const fetchGuildChannels = (guildId: string): DiscordEffect<ReadonlyArray<DiscordChannel>> =>
  discordRequest((creds) => authedGet(creds, `/guilds/${guildId}/channels`), DiscordChannelListSchema);

/**
 * Fetches messages from a single channel (`GET /channels/{id}/messages`).
 *
 * Discord's pagination model is cursor-based on message snowflakes:
 *  - `after=<id>` returns messages newer than `<id>` (oldest-first per page).
 *  - omitted: returns the most recent page (newest-first).
 *
 * We always pass `after` (from `IntegrationTarget.cursor`) so incremental sync
 * picks up only new messages. On first sync the cursor is undefined; we walk
 * forward from the beginning of time using `after='0'` which Discord treats
 * as "give me the oldest messages first."
 *
 * Drains pages while each is full (`length === limit`).
 */
export const fetchHistory = (
  channelId: string,
  options: { after?: string; limit?: number } = {},
): DiscordEffect<ReadonlyArray<DiscordMessage>> =>
  Effect.gen(function* () {
    const all: DiscordMessage[] = [];
    const limit = options.limit ?? 100;
    let after = options.after ?? '0';
    while (true) {
      const params: Record<string, string | number> = { limit, after };
      const page = yield* discordRequest(
        (creds) => authedGet(creds, `/channels/${channelId}/messages`, params),
        DiscordMessageListSchema,
      );
      if (page.length === 0) {
        break;
      }
      // Discord returns newest-first within a page even when paging with `after`;
      // sort ascending so the caller appends chronologically and the next `after`
      // is the largest id seen.
      const sorted = [...page].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      all.push(...sorted);
      if (sorted.length < limit) {
        break;
      }
      after = sorted[sorted.length - 1].id;
    }
    return all;
  });
