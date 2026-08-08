//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import { proxyFetchLegacy } from '@dxos/edge-client/cors-proxy';

/**
 * Supplies a custom `fetch` that routes chess.com Published API requests through the EDGE CORS proxy.
 * The upstream API does not send browser CORS headers.
 */
// `Layer.Layer<never>`: v4 models `Fetch` as a `Context.Reference` with a default, so setting it
// overrides the ambient value rather than adding a service to the layer's output.
export const makeProxyHttpClientLayer = (): Layer.Layer<never> =>
  Layer.succeed(FetchHttpClient.Fetch, ((input, init) => {
    const url = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url);
    return proxyFetchLegacy(url, init);
  }) as typeof fetch);

/** {@link FetchHttpClient.layer} wired to {@link makeProxyHttpClientLayer}. */
export const ChessComHttpClientLayer = FetchHttpClient.layer.pipe(Layer.provide(makeProxyHttpClientLayer()));
