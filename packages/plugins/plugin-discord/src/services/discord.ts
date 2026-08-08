//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import { DiscordConfig, type DiscordREST, DiscordRESTLive } from '@dxos/discord-client';
import { Database, Err, type Ref } from '@dxos/echo';
import * as Connection from '@dxos/plugin-connector/Connection';

import { DISCORD_API_BASE } from '../constants';
import { edgeProxyFetchLayer } from './proxy-http-client';

/**
 * Build a `DiscordREST` layer pinned to a specific credential.
 *
 * `baseUrl` stays at the real Discord host so the proxy's URL rewrite and
 * `Authorization` → `X-Cors-Proxy-Authorization` remap fire uniformly for
 * every request.
 */
const makeLayer = (token: string, tokenKind: 'Bot' | 'Bearer'): Layer.Layer<DiscordREST> =>
  DiscordRESTLive.pipe(
    Layer.provide(DiscordConfig.layer({ token: Redacted.make(token), tokenKind, rest: { baseUrl: DISCORD_API_BASE } })),
    Layer.provide(FetchHttpClient.layer.pipe(Layer.provide(edgeProxyFetchLayer))),
  );

/**
 * Build a `DiscordREST` layer pinned to a specific bot token.
 *
 * Used by the credential-form validation flow, which holds a raw token that
 * hasn't yet been persisted as an `AccessToken`.
 */
export const makeDiscordLayerFromToken = (token: string): Layer.Layer<DiscordREST> => makeLayer(token, 'Bot');

/**
 * Build a `DiscordREST` layer pinned to a specific user OAuth token, which Discord requires be sent
 * as `Bearer` rather than the `Bot` scheme.
 */
export const makeDiscordUserLayerFromToken = (token: string): Layer.Layer<DiscordREST> => makeLayer(token, 'Bearer');

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
  makeLayerFromConnection(connectionRef, makeDiscordLayerFromToken);

/**
 * Build a `DiscordREST` layer from a persisted {@link Connection} ref, for use
 * by Discord user OAuth operation handlers.
 */
export const makeDiscordUserLayer = (
  connectionRef: Ref.Ref<Connection.Connection>,
): Layer.Layer<DiscordREST, Err.EntityNotFoundError> =>
  makeLayerFromConnection(connectionRef, makeDiscordUserLayerFromToken);

const makeLayerFromConnection = (
  connectionRef: Ref.Ref<Connection.Connection>,
  build: (token: string) => Layer.Layer<DiscordREST>,
): Layer.Layer<DiscordREST, Err.EntityNotFoundError> =>
  Layer.unwrap(
    Effect.gen(function* () {
      const connection = yield* Database.load(connectionRef);
      const accessToken = yield* Database.load(connection.accessToken);
      return build(accessToken.token);
    }),
  );
