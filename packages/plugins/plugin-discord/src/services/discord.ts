//
// Copyright 2026 DXOS.org
//

import { DiscordConfig, type DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import * as Credential from '@dxos/compute/Credential';
import { Database, Error, type Ref } from '@dxos/echo';
import { type AccessToken, Connection } from '@dxos/link';

import { DISCORD_API_BASE } from '../constants.ts';
import { makeEdgeProxyHttpClientLayer } from './proxy-http-client.ts';

/**
 * Build a `DiscordREST` layer pinned to a specific bot token.
 *
 * Composes dfx's `DiscordRESTMemoryLive` (which brings its own in-memory
 * rate-limit store) with a `DiscordConfig` carrying the token and our edge
 * proxy `FetchHttpClient`. `baseUrl` stays at the real Discord host so the
 * proxy's URL rewrite and `Authorization` → `X-Cors-Proxy-Authorization`
 * remap fire uniformly for every request dfx emits.
 *
 * Used by the credential-form validation flow, which holds a raw token that
 * hasn't yet been persisted as an `AccessToken`.
 */
export const makeDiscordLayerFromToken = (token: string): Layer.Layer<DiscordREST> =>
  DiscordRESTMemoryLive.pipe(
    Layer.provide(DiscordConfig.layer({ token: Redacted.make(token), rest: { baseUrl: DISCORD_API_BASE } })),
    Layer.provide(FetchHttpClient.layer.pipe(Layer.provide(makeEdgeProxyHttpClientLayer()))),
  );

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
  const accessToken = yield* Database.load(connection.accessToken);
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
 * Build a `DiscordREST` layer pinned to a specific user OAuth token.
 *
 * Identical to `makeDiscordLayerFromToken` except the edge-proxy fetch layer
 * is configured to rewrite dfx's `Bot <token>` Authorization header to
 * `Bearer <token>`, which is what Discord requires for user OAuth credentials.
 */
export const makeDiscordUserLayerFromToken = (token: string): Layer.Layer<DiscordREST> =>
  DiscordRESTMemoryLive.pipe(
    Layer.provide(DiscordConfig.layer({ token: Redacted.make(token), rest: { baseUrl: DISCORD_API_BASE } })),
    Layer.provide(FetchHttpClient.layer.pipe(Layer.provide(makeEdgeProxyHttpClientLayer({ tokenKind: 'Bearer' })))),
  );

/**
 * Build a `DiscordREST` layer from a persisted {@link Connection} ref, for use
 * by Discord user OAuth operation handlers.
 */
export const makeDiscordUserLayer = (
  connectionRef: Ref.Ref<Connection.Connection>,
): Layer.Layer<DiscordREST, Error.EntityNotFoundError, Credential.CredentialsService> =>
  Layer.unwrap(Effect.map(resolveConnectionToken(connectionRef), makeDiscordUserLayerFromToken));
