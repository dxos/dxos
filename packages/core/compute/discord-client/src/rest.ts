//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { type DiscordRestError, ErrorResponse, RatelimitedResponse, RequestError } from './errors';
import {
  ActiveThreadsResponse,
  ErrorResponseBody,
  GuildChannelResponse,
  type ListMessagesOptions,
  type ListMyGuildsOptions,
  MessageResponse,
  MyGuildResponse,
  UserResponse,
} from './types';

export const DISCORD_API_BASE = 'https://discord.com/api/v10';

/** Discord's REST docs require this exact `DiscordBot ($url, $version)` shape for bot traffic. */
const DEFAULT_USER_AGENT = 'DiscordBot (https://dxos.org, 0.1.0)';

/** Total attempts per request, including the first. */
const MAX_ATTEMPTS = 5;

/** Cap on an honoured `retry_after`: a longer backoff is a stall, not a retry. */
const MAX_RETRY_SECONDS = 30;

const BASE_BACKOFF_MILLIS = 500;

export type DiscordConfigValue = {
  readonly token: Redacted.Redacted<string>;
  /**
   * Authorization scheme. Bot tokens use `Bot`, user OAuth tokens `Bearer`; sending the wrong one
   * is indistinguishable from an invalid token at the API.
   */
  readonly tokenKind: 'Bot' | 'Bearer';
  /** API root, without a trailing slash. Overridden to route through a CORS proxy in the browser. */
  readonly baseUrl: string;
  readonly userAgent: string;
};

export type DiscordConfigOptions = {
  readonly token: Redacted.Redacted<string>;
  readonly tokenKind?: 'Bot' | 'Bearer';
  readonly rest?: {
    readonly baseUrl?: string;
    readonly userAgent?: string;
  };
};

export class DiscordConfig extends Context.Service<DiscordConfig, DiscordConfigValue>()(
  '@dxos/discord-client/DiscordConfig',
) {
  static layer = (options: DiscordConfigOptions): Layer.Layer<DiscordConfig> =>
    Layer.succeed(DiscordConfig, {
      token: options.token,
      tokenKind: options.tokenKind ?? 'Bot',
      baseUrl: options.rest?.baseUrl ?? DISCORD_API_BASE,
      userAgent: options.rest?.userAgent ?? DEFAULT_USER_AGENT,
    });
}

/** Query parameters as the endpoint wrappers pass them, before absent entries are dropped. */
type QueryParams = Readonly<Record<string, string | number | undefined>>;

/** Drops absent options and stringifies the rest, since Discord takes every query param as text. */
const toUrlParams = (params: QueryParams): Record<string, string> =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );

/**
 * Issues one request and decodes its body, retrying 429s for the interval Discord asks for and 5xx
 * on an exponential backoff.
 *
 * The response is inspected rather than passed through `HttpClient.filterStatusOk` because
 * Discord's `{ code, message }` error envelope is the only explanation of a refusal, and a filter
 * would discard it before it could be attached to the failure.
 */
const send = <A>(
  config: DiscordConfigValue,
  client: HttpClient.HttpClient,
  path: string,
  schema: Schema.Codec<A, any>,
  params: QueryParams,
  attempt: number,
): Effect.Effect<A, DiscordRestError> =>
  Effect.gen(function* () {
    const request = HttpClientRequest.get(`${config.baseUrl}${path}`).pipe(
      HttpClientRequest.setHeaders({
        'Authorization': `${config.tokenKind} ${Redacted.value(config.token)}`,
        'Accept': 'application/json',
        'User-Agent': config.userAgent,
      }),
      HttpClientRequest.setUrlParams(toUrlParams(params)),
    );

    const response = yield* client.execute(request).pipe(Effect.mapError((cause) => new RequestError({ cause })));

    if (response.status < 300) {
      return yield* response.json.pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(schema)),
        Effect.mapError((cause) => new RequestError({ cause })),
      );
    }

    // An error body is best-effort: Cloudflare and the proxies in front of Discord answer in HTML.
    const body = yield* response.json.pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(ErrorResponseBody)),
      Effect.catch(() => Effect.succeed<ErrorResponseBody>({})),
    );

    if (attempt < MAX_ATTEMPTS && (response.status === 429 || response.status >= 500)) {
      const backoff =
        response.status === 429 && typeof body.retry_after === 'number'
          ? Duration.seconds(Math.min(body.retry_after, MAX_RETRY_SECONDS))
          : Duration.millis(BASE_BACKOFF_MILLIS * 2 ** (attempt - 1));
      yield* Effect.sleep(backoff);
      return yield* send(config, client, path, schema, params, attempt + 1);
    }

    return yield* Effect.fail(
      response.status === 429
        ? new RatelimitedResponse({ cause: body, response: { status: response.status } })
        : new ErrorResponse({ cause: body, response: { status: response.status } }),
    );
  }).pipe(Effect.scoped);

export type DiscordRESTApi = {
  /** `GET /users/@me` — the identity behind the credential. Doubles as a token check. */
  readonly getMyUser: () => Effect.Effect<UserResponse, DiscordRestError>;
  /** `GET /users/@me/guilds` — one page; the caller pages by passing the last id as `after`. */
  readonly listMyGuilds: (
    options?: ListMyGuildsOptions,
  ) => Effect.Effect<ReadonlyArray<MyGuildResponse>, DiscordRestError>;
  /** `GET /guilds/{id}/channels` — every channel in the guild, of every type. */
  readonly listGuildChannels: (guildId: string) => Effect.Effect<ReadonlyArray<GuildChannelResponse>, DiscordRestError>;
  /** `GET /guilds/{id}/threads/active`. */
  readonly getActiveGuildThreads: (guildId: string) => Effect.Effect<ActiveThreadsResponse, DiscordRestError>;
  /** `GET /channels/{id}/messages` — one page, returned newest-first by Discord. */
  readonly listMessages: (
    channelId: string,
    options?: ListMessagesOptions,
  ) => Effect.Effect<ReadonlyArray<MessageResponse>, DiscordRestError>;
};

export class DiscordREST extends Context.Service<DiscordREST, DiscordRESTApi>()('@dxos/discord-client/DiscordREST') {}

const MessageList = Schema.Array(MessageResponse);
const GuildList = Schema.Array(MyGuildResponse);
const ChannelList = Schema.Array(GuildChannelResponse);

/**
 * Binds {@link DiscordREST} to the ambient {@link DiscordConfig} and `HttpClient`.
 *
 * Rate limiting is per-request rather than a shared bucket store: DXOS issues Discord traffic in
 * short, low-concurrency bursts, where honouring `retry_after` on the request that hit the limit is
 * equivalent to pre-emptive bucket tracking and needs no state.
 */
export const DiscordRESTLive: Layer.Layer<DiscordREST, never, DiscordConfig | HttpClient.HttpClient> = Layer.effect(
  DiscordREST,
  Effect.gen(function* () {
    const config = yield* DiscordConfig;
    const client = yield* HttpClient.HttpClient;
    const call = <A>(path: string, schema: Schema.Codec<A, any>, params: QueryParams = {}) =>
      send(config, client, path, schema, params, 1);

    return {
      getMyUser: () => call('/users/@me', UserResponse),
      listMyGuilds: (options) => call('/users/@me/guilds', GuildList, { ...options }),
      listGuildChannels: (guildId) => call(`/guilds/${guildId}/channels`, ChannelList),
      getActiveGuildThreads: (guildId) => call(`/guilds/${guildId}/threads/active`, ActiveThreadsResponse),
      listMessages: (channelId, options) => call(`/channels/${channelId}/messages`, MessageList, { ...options }),
    };
  }),
);
