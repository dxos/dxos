//
// Copyright 2026 DXOS.org
//

import { DiscordConfig, type DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

import * as Credential from '@dxos/compute/Credential';
import { Database, Error, type Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type AccessToken, Connection } from '@dxos/link';

import { DISCORD_API_BASE, DISCORD_USER_PROVIDER_ID } from '../constants.ts';
import { DISCORD_BOT_USER_AGENT, makeEdgeProxyHttpClientLayer } from './proxy-http-client.ts';

/** Where the Discord REST client sends requests: the API base and whether the CORS proxy carries them. */
export type Endpoint = {
  readonly baseUrl: string;
  /**
   * `proxy` routes through the integration proxy, which a browser needs (Discord permits no CORS); `direct` fetches
   * the base itself, as a worker can.
   */
  readonly via: 'proxy' | 'direct';
};

/**
 * The REST endpoint, as a reference so a host can point the client elsewhere: EDGE fetches directly, and its test
 * stack points it at a fake Discord the public proxy could not reach.
 */
export const DiscordEndpoint = Context.Reference<Endpoint>('@dxos/plugin-discord/DiscordEndpoint', {
  defaultValue: () => ({ baseUrl: DISCORD_API_BASE, via: 'proxy' }),
});

/** A Discord API request as plain data: `path` is relative to the API base, which the host chooses. */
export type HttpRequest = {
  readonly method: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  /** Base64, so a binary upload crosses unchanged. */
  readonly body?: string;
};

export const HttpResponse = Schema.Struct({
  status: Schema.Number,
  statusText: Schema.String,
  headers: Schema.Record(Schema.String, Schema.String),
  /** Base64. */
  body: Schema.String,
});
export interface HttpResponse extends Schema.Schema.Type<typeof HttpResponse> {}

export interface DiscordHttpService {
  readonly fetch: (request: HttpRequest) => Effect.Effect<unknown, Error>;
}

/**
 * Sends Discord API requests for a host that holds the network path to Discord itself (EDGE's discord-service, which
 * also points its own test stack at a fake Discord). Optional: without it the client fetches the {@link DiscordEndpoint}.
 */
export class DiscordHttp extends Context.Service<DiscordHttp, DiscordHttpService>()(
  '@dxos/plugin-discord/DiscordHttp',
) {}

type TokenKind = 'Bot' | 'Bearer';

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(text);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

/** Sends each request through {@link DiscordHttp}, with the path below `baseUrl` that dfx addressed. */
const hostFetchLayer = (http: DiscordHttpService, baseUrl: string, tokenKind: TokenKind): Layer.Layer<never> => {
  const hostFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    if (!request.url.startsWith(baseUrl)) {
      throw new TypeError(`Not a Discord API request: ${request.url}`);
    }
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    if (tokenKind === 'Bearer' && headers.authorization?.startsWith('Bot ')) {
      headers.authorization = `Bearer ${headers.authorization.slice(4)}`;
    }
    const body = request.body === null ? undefined : toBase64(new Uint8Array(await request.arrayBuffer()));
    const response = await EffectEx.runPromise(
      http
        .fetch({
          method: request.method,
          path: request.url.slice(baseUrl.length),
          headers,
          ...(body === undefined ? {} : { body }),
        })
        .pipe(Effect.flatMap((value) => Schema.decodeUnknownEffect(HttpResponse)(value))),
    );
    // A null-body status (204, 304) refuses a body, even an empty one.
    const nullBody = response.status === 204 || response.status === 304;
    return new Response(nullBody ? null : fromBase64(response.body), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
  return Layer.succeed(FetchHttpClient.Fetch, hostFetch);
};

/** dfx always writes `Bot <token>`; a user OAuth token must travel as `Bearer <token>`. */
const directFetchLayer = (tokenKind: TokenKind): Layer.Layer<never> => {
  const directFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers ?? undefined).forEach((value, key) => {
      headers.set(key, value);
    });
    const auth = headers.get('Authorization');
    if (tokenKind === 'Bearer' && auth?.startsWith('Bot ')) {
      headers.set('Authorization', `Bearer ${auth.slice(4)}`);
    }
    // Discord intermittently refuses guild endpoints without a bot User-Agent (see `proxy-http-client.ts`).
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', DISCORD_BOT_USER_AGENT);
    }
    return globalThis.fetch(input, { ...init, headers });
  };
  return Layer.succeed(FetchHttpClient.Fetch, directFetch);
};

/** A `DiscordREST` layer for `token`, sent to the {@link DiscordEndpoint} in effect where the layer is built. */
const makeRestLayer = (token: string, tokenKind: TokenKind): Layer.Layer<DiscordREST> =>
  Layer.unwrap(
    Effect.gen(function* () {
      const endpoint = yield* DiscordEndpoint;
      const http = yield* Effect.serviceOption(DiscordHttp);
      const fetchLayer = Option.isSome(http)
        ? hostFetchLayer(http.value, endpoint.baseUrl, tokenKind)
        : endpoint.via === 'direct'
          ? directFetchLayer(tokenKind)
          : makeEdgeProxyHttpClientLayer(tokenKind === 'Bearer' ? { tokenKind } : undefined);
      return DiscordRESTMemoryLive.pipe(
        Layer.provide(DiscordConfig.layer({ token: Redacted.make(token), rest: { baseUrl: endpoint.baseUrl } })),
        Layer.provide(FetchHttpClient.layer.pipe(Layer.provide(fetchLayer))),
      );
    }),
  );

/**
 * Build a `DiscordREST` layer pinned to a specific bot token.
 *
 * Composes dfx's `DiscordRESTMemoryLive` (which brings its own in-memory rate-limit store) with a `DiscordConfig`
 * carrying the token, sent to the {@link DiscordEndpoint}. Through the proxy, `baseUrl` stays at the real Discord host
 * so the proxy's URL rewrite and `Authorization` → `X-Cors-Proxy-Authorization` remap fire uniformly.
 *
 * Used by the credential-form validation flow, which holds a raw token that hasn't yet been persisted as an
 * `AccessToken`.
 */
export const makeDiscordLayerFromToken = (token: string): Layer.Layer<DiscordREST> => makeRestLayer(token, 'Bot');

/**
 * Resolve the secret behind an `AccessToken` through {@link Credential.CredentialsService}.
 *
 * Looked up by id so an EDGE-custodied (managed) token resolves server-side, while an inline
 * token stored on the object is still returned as-is by the database-backed credentials layer.
 */
export const resolveDiscordToken = (
  accessToken: AccessToken.AccessToken,
): Effect.Effect<string, never, Credential.CredentialsService> =>
  Credential.getApiKeyValue({ accessTokenId: accessToken.id });

/** Load a connection's `AccessToken` and resolve its secret. */
const resolveConnectionToken = Effect.fnUntraced(function* (connectionRef: Ref.Ref<Connection.Connection>) {
  const connection = yield* Database.load(connectionRef);
  const accessToken = yield* Database.load(Connection.getAccessToken(connection));
  return yield* resolveDiscordToken(accessToken);
});

/**
 * Build a `DiscordREST` layer from a persisted {@link Connection} ref.
 *
 * Resolves the connection's token on layer construction; the operation
 * handler runs against the resulting `DiscordREST` without ever seeing the
 * raw token. Requires `Database.Service`, which the operation runner already
 * provides via the connection's database.
 */
export const makeDiscordLayer = (
  connectionRef: Ref.Ref<Connection.Connection>,
): Layer.Layer<DiscordREST, Error.EntityNotFoundError, Credential.CredentialsService> =>
  Layer.unwrap(Effect.map(resolveConnectionToken(connectionRef), makeDiscordLayerFromToken));

/**
 * Build a `DiscordREST` layer pinned to a specific user OAuth token: as `makeDiscordLayerFromToken`, with dfx's
 * `Bot <token>` Authorization header sent as `Bearer <token>`, which Discord requires for user OAuth credentials.
 */
export const makeDiscordUserLayerFromToken = (token: string): Layer.Layer<DiscordREST> =>
  makeRestLayer(token, 'Bearer');

/**
 * Build a `DiscordREST` layer from a persisted {@link Connection} ref, for use
 * by Discord user OAuth operation handlers.
 */
export const makeDiscordUserLayer = (
  connectionRef: Ref.Ref<Connection.Connection>,
): Layer.Layer<DiscordREST, Error.EntityNotFoundError, Credential.CredentialsService> =>
  Layer.unwrap(Effect.map(resolveConnectionToken(connectionRef), makeDiscordUserLayerFromToken));

/**
 * Build a `DiscordREST` layer from a persisted {@link Connection} ref with the token kind its connector issues: a
 * Discord user OAuth connection's token is a bearer token, any other a bot token.
 */
export const makeDiscordConnectionLayer = (
  connectionRef: Ref.Ref<Connection.Connection>,
): Layer.Layer<DiscordREST, Error.EntityNotFoundError, Credential.CredentialsService> =>
  Layer.unwrap(
    Effect.gen(function* () {
      const connection = yield* Database.load(connectionRef);
      const token = yield* resolveConnectionToken(connectionRef);
      return connection.connectorId === DISCORD_USER_PROVIDER_ID
        ? makeDiscordUserLayerFromToken(token)
        : makeDiscordLayerFromToken(token);
    }),
  );
