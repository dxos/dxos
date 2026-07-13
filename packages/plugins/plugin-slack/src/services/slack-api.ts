//
// Copyright 2026 DXOS.org
//

// TODO(wittjosiah): Refactor to use a dfx-style Effect-native client.

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
import { Connection } from '@dxos/types';

import { SLACK_API_BASE } from '../constants';
import { SlackApiError } from '../errors';

/** Slack bearer token (`xoxp-...` or `xoxb-...`). */
type SlackCredentialsValue = {
  token: string;
};

const SlackUserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.optional),
  real_name: Schema.String.pipe(Schema.optional),
  is_bot: Schema.Boolean.pipe(Schema.optional),
  profile: Schema.Struct({
    display_name: Schema.String.pipe(Schema.optional),
    real_name: Schema.String.pipe(Schema.optional),
    email: Schema.String.pipe(Schema.optional),
    image_72: Schema.String.pipe(Schema.optional),
  }).pipe(Schema.optional),
});

export type SlackUser = Schema.Schema.Type<typeof SlackUserSchema>;

const SlackAuthTestSchema = Schema.Struct({
  ok: Schema.Boolean,
  error: Schema.String.pipe(Schema.optional),
  url: Schema.String.pipe(Schema.optional),
  team: Schema.String.pipe(Schema.optional),
  user: Schema.String.pipe(Schema.optional),
  team_id: Schema.String.pipe(Schema.optional),
  user_id: Schema.String.pipe(Schema.optional),
  bot_id: Schema.String.pipe(Schema.optional),
});

export type SlackAuthTest = Schema.Schema.Type<typeof SlackAuthTestSchema>;

const SlackConversationSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.optional),
  is_channel: Schema.Boolean.pipe(Schema.optional),
  is_group: Schema.Boolean.pipe(Schema.optional),
  is_im: Schema.Boolean.pipe(Schema.optional),
  is_mpim: Schema.Boolean.pipe(Schema.optional),
  is_private: Schema.Boolean.pipe(Schema.optional),
  is_archived: Schema.Boolean.pipe(Schema.optional),
  /** For IMs: the user this conversation is with. */
  user: Schema.String.pipe(Schema.optional),
  /** For mpims: comma-joined list of user ids in `name`. */
  num_members: Schema.Number.pipe(Schema.optional),
  topic: Schema.Struct({ value: Schema.String }).pipe(Schema.optional),
  purpose: Schema.Struct({ value: Schema.String }).pipe(Schema.optional),
});

export type SlackConversation = Schema.Schema.Type<typeof SlackConversationSchema>;

const SlackMessageSchema = Schema.Struct({
  type: Schema.String,
  /** Slack timestamp; this is the canonical message id within a conversation. */
  ts: Schema.String,
  user: Schema.String.pipe(Schema.optional),
  bot_id: Schema.String.pipe(Schema.optional),
  username: Schema.String.pipe(Schema.optional),
  text: Schema.String.pipe(Schema.optional),
  /** Set on threaded replies; equal to `ts` of the parent message. */
  thread_ts: Schema.String.pipe(Schema.optional),
  reply_count: Schema.Number.pipe(Schema.optional),
  subtype: Schema.String.pipe(Schema.optional),
  /** Pre-parsed Slack rich-text blocks; passed through to consumers as-is. */
  blocks: Schema.Array(Schema.Unknown).pipe(Schema.optional),
});

export type SlackMessage = Schema.Schema.Type<typeof SlackMessageSchema>;

const SlackPaginatedMetadataSchema = Schema.Struct({
  next_cursor: Schema.String.pipe(Schema.optional),
});

const SlackConversationListResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  error: Schema.String.pipe(Schema.optional),
  channels: Schema.Array(SlackConversationSchema).pipe(Schema.optional),
  response_metadata: SlackPaginatedMetadataSchema.pipe(Schema.optional),
});

const SlackHistoryResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  error: Schema.String.pipe(Schema.optional),
  messages: Schema.Array(SlackMessageSchema).pipe(Schema.optional),
  has_more: Schema.Boolean.pipe(Schema.optional),
  response_metadata: SlackPaginatedMetadataSchema.pipe(Schema.optional),
});

const SlackUsersInfoResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  error: Schema.String.pipe(Schema.optional),
  user: SlackUserSchema.pipe(Schema.optional),
});

/**
 * Layer-based credentials service. Every API call pulls creds from this service
 * rather than threading them through, so callers compose
 * `Effect.provide(SlackApi.SlackCredentials.fromConnection(ref))` once at the
 * operation boundary.
 */
export class SlackCredentials extends Context.Tag('@dxos/plugin-slack/SlackCredentials')<
  SlackCredentials,
  SlackCredentialsValue
>() {
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
    Layer.effect(
      SlackCredentials,
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const accessToken = yield* Database.load(connection.accessToken);
        return { token: accessToken.token };
      }),
    );
}

type SlackEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException | SlackApiError,
  HttpClient.HttpClient | SlackCredentials
>;

/**
 * Slack uses HTTP 200 + `{ ok: false, error: '<code>' }` for application errors,
 * so 5xx and 429 are the only meaningful retryable HTTP statuses. For
 * `ok: false`, we surface a {@link SlackApiError} from the response body —
 * that error is NOT retried because the failure mode (auth revoked, missing
 * scope, channel not found) won't change between attempts.
 *
 *  - Transport / encode / invalid-URL failures: yes (transient by nature).
 *  - 429 (rate limited) and 5xx: yes — Slack's rate limiter sets `Retry-After`,
 *    but exponential backoff is a reasonable default until we wire up the header.
 *  - 4xx other than 429: no — won't recover on retry.
 *  - TimeoutException: yes.
 *  - Schema decode failures (`ParseError`): no — payload won't become valid on retry.
 *  - SlackApiError: no — body-level "ok: false" is an application error, not transient.
 */
const shouldRetry = (
  error: HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException | SlackApiError,
): boolean => {
  if (error instanceof ParseResult.ParseError) {
    return false;
  }
  if (SlackApiError.is(error)) {
    return false;
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
 * Common pipeline for Slack requests:
 *  - POST `application/x-www-form-urlencoded` body containing the bearer token
 *    and any per-call params (see {@link authedPost} for why this shape).
 *  - Tracer disabled to avoid `traceparent` header tripping CORS preflight on
 *    `slack.com/api/*` (same workaround as Trello and Google userinfo).
 *  - Decode body with Effect Schema.
 *  - Promote `{ ok: false }` to {@link SlackApiError} carrying the error code.
 *  - 15s timeout, exponential jittered retry up to 3 attempts on transient failures only.
 */
const runRequest = <T extends { ok: boolean; error?: string }>(
  request: HttpClientRequest.HttpClientRequest,
  schema: Schema.Schema<T>,
): SlackEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
    return yield* clientNoTracer.execute(request).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknown(schema))),
      Effect.flatMap((body) =>
        body.ok ? Effect.succeed(body) : Effect.fail(new SlackApiError({ context: { code: body.error ?? 'unknown' } })),
      ),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  });

const slackRequest = <T extends { ok: boolean; error?: string }>(
  build: (creds: SlackCredentialsValue) => HttpClientRequest.HttpClientRequest,
  schema: Schema.Schema<T>,
): SlackEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* SlackCredentials;
    return yield* runRequest(build(creds), schema);
  });

/**
 * Builds an authenticated POST against `slack.com/api/<path>` with the bearer
 * token plus any extra params encoded as `application/x-www-form-urlencoded`
 * in the request body.
 *
 * Why POST + body, not GET + query string and not Authorization header:
 *  - Slack's CORS response on `slack.com/api/*` does NOT include
 *    `Authorization` in `Access-Control-Allow-Headers`. Sending the bearer
 *    header triggers a preflight that's rejected, blocking every request
 *    from a browser origin.
 *  - The legacy `?token=…` query-string form is rejected with `invalid_auth`
 *    for OAuth v2 / granular-scope tokens (`xoxb-…`). Confirmed by direct
 *    curl: `Authorization: Bearer …` returns `ok: true`, `?token=…` on the
 *    same token returns `invalid_auth`. Slack's docs imply this still works,
 *    but in practice they've tightened it for v2 tokens.
 *  - POST with `application/x-www-form-urlencoded` is a "simple" CORS
 *    request — no preflight — and Slack's Web API accepts the token in the
 *    body under the same `token` key, equivalently to the bearer header.
 *    Every method we use (`auth.test`, `conversations.list`,
 *    `conversations.history`, `users.info`) accepts POST.
 */
const authedPost = (creds: SlackCredentialsValue, path: string, params: Record<string, string | number> = {}) =>
  HttpClientRequest.post(`${SLACK_API_BASE}/${path}`).pipe(
    HttpClientRequest.bodyUrlParams({
      token: creds.token,
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    }),
  );

/**
 * Returns the authenticated user's identity (`auth.test`).
 *
 * Used by `onTokenCreated` to populate `accessToken.account` after OAuth.
 * Cheap, no scope requirement beyond the token being valid.
 */
export const fetchAuthTest = (): SlackEffect<SlackAuthTest> =>
  slackRequest((creds) => authedPost(creds, 'auth.test'), SlackAuthTestSchema);

/**
 * Lists all conversations the authenticated user can access, across types.
 *
 * Slack treats public channels, private channels, IMs, and mpims as a single
 * `conversations` namespace; we ask for every type up front so discovery
 * returns one flat list (matches the user's mental model: "pick a chat to
 * sync"). Pagination is opaque-cursor; we drain every page so the discovery
 * UI sees the complete list.
 */
export const fetchConversations = (
  options: {
    types?: ReadonlyArray<'public_channel' | 'private_channel' | 'im' | 'mpim'>;
    excludeArchived?: boolean;
  } = {},
): SlackEffect<ReadonlyArray<SlackConversation>> =>
  Effect.gen(function* () {
    const types = (options.types ?? ['public_channel', 'private_channel']).join(',');
    const excludeArchived = options.excludeArchived !== false;
    const all: SlackConversation[] = [];
    let cursor: string | undefined;
    do {
      const params: Record<string, string | number> = {
        types,
        exclude_archived: excludeArchived ? 'true' : 'false',
        limit: 200,
      };
      if (cursor) {
        params.cursor = cursor;
      }
      const page = yield* slackRequest(
        (creds) => authedPost(creds, 'conversations.list', params),
        SlackConversationListResponseSchema,
      );
      if (page.channels) {
        all.push(...page.channels);
      }
      cursor =
        page.response_metadata?.next_cursor && page.response_metadata.next_cursor.length > 0
          ? page.response_metadata.next_cursor
          : undefined;
    } while (cursor);
    return all;
  });

/**
 * Returns user info by id (`users.info`).
 *
 * Used to resolve `Message.user` Slack ids into display names for IM/mpim
 * `name` derivation. Single-user lookup; callers cache results across a sync
 * pass so the same user isn't refetched per message.
 */
export const fetchUser = (userId: string): SlackEffect<SlackUser | undefined> =>
  Effect.gen(function* () {
    const response = yield* slackRequest(
      (creds) => authedPost(creds, 'users.info', { user: userId }),
      SlackUsersInfoResponseSchema,
    );
    return response.user;
  });

const SlackBotInfoSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.optional),
  app_id: Schema.String.pipe(Schema.optional),
  user_id: Schema.String.pipe(Schema.optional),
  icons: Schema.Struct({
    image_36: Schema.String.pipe(Schema.optional),
    image_48: Schema.String.pipe(Schema.optional),
    image_72: Schema.String.pipe(Schema.optional),
  }).pipe(Schema.optional),
});

export type SlackBot = Schema.Schema.Type<typeof SlackBotInfoSchema>;

const SlackBotsInfoResponseSchema = Schema.Struct({
  ok: Schema.Boolean,
  error: Schema.String.pipe(Schema.optional),
  bot: SlackBotInfoSchema.pipe(Schema.optional),
});

/**
 * Returns bot info by bot id (`bots.info`).
 *
 * Used to resolve the friendly name of bot-posted messages where Slack
 * supplies only `bot_id` (incoming-webhook posts, legacy bot users). The
 * `bot_id` namespace (`B…`) is disjoint from user ids (`U…`) and `users.info`
 * does NOT accept bot ids — the dedicated `bots.info` method is required.
 */
export const fetchBot = (botId: string): SlackEffect<SlackBot | undefined> =>
  Effect.gen(function* () {
    const response = yield* slackRequest(
      (creds) => authedPost(creds, 'bots.info', { bot: botId }),
      SlackBotsInfoResponseSchema,
    );
    return response.bot;
  });

/**
 * Fetches messages from a single conversation (`conversations.history`).
 *
 * `oldest` is a Slack ts string (`"1700000000.000000"`) — we store the most
 * recent processed `ts` as the binding's `cursor` so subsequent syncs
 * pick up only new messages. Drains every page so callers see the full
 * delta in one call; `limit` caps the per-request page size only.
 *
 * Threaded replies are NOT included here — Slack returns parent messages with
 * `thread_ts === ts` and `reply_count > 0`; replies live in
 * `conversations.replies` and would be fetched separately if needed.
 */
export const fetchHistory = (
  channelId: string,
  options: { oldest?: string; limit?: number } = {},
): SlackEffect<ReadonlyArray<SlackMessage>> =>
  Effect.gen(function* () {
    const all: SlackMessage[] = [];
    let cursor: string | undefined;
    const limit = options.limit ?? 200;
    do {
      const params: Record<string, string | number> = { channel: channelId, limit };
      if (options.oldest) {
        params.oldest = options.oldest;
      }
      if (cursor) {
        params.cursor = cursor;
      }
      const page = yield* slackRequest(
        (creds) => authedPost(creds, 'conversations.history', params),
        SlackHistoryResponseSchema,
      );
      if (page.messages) {
        all.push(...page.messages);
      }
      cursor =
        page.response_metadata?.next_cursor && page.response_metadata.next_cursor.length > 0
          ? page.response_metadata.next_cursor
          : undefined;
    } while (cursor);
    return all;
  });
