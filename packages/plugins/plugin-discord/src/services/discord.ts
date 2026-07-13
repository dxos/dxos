//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { DiscordConfig, type DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { Database, Err, type Ref } from '@dxos/echo';
import { Connection } from '@dxos/types';

import { DISCORD_API_BASE } from '../constants';
import { makeEdgeProxyHttpClientLayer } from './proxy-http-client';

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
 * Build a `DiscordREST` layer from a persisted {@link Connection} ref.
 *
 * Loads the connection's `AccessToken` on layer construction; the operation
 * handler runs against the resulting `DiscordREST` without ever seeing the
 * raw token. Requires `Database.Service`, which the operation runner already
 * provides via the connection's database.
 */
export const makeDiscordLayer = (
  connectionRef: Ref.Ref<Connection.Connection>,
): Layer.Layer<DiscordREST, Err.EntityNotFoundError> =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const connection = yield* Database.load(connectionRef);
      const accessToken = yield* Database.load(connection.accessToken);
      return makeDiscordLayerFromToken(accessToken.token);
    }),
  );

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
): Layer.Layer<DiscordREST, Err.EntityNotFoundError> =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const connection = yield* Database.load(connectionRef);
      const accessToken = yield* Database.load(connection.accessToken);
      return makeDiscordUserLayerFromToken(accessToken.token);
    }),
  );
