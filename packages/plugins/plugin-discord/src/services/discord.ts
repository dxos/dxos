//
// Copyright 2026 DXOS.org
//

import { DiscordConfig, type DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import * as Credential from '@dxos/compute/Credential';
import { Database, Error, type Ref } from '@dxos/echo';
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

type TokenKind = 'Bot' | 'Bearer';

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
      const fetchLayer =
        endpoint.via === 'direct'
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
