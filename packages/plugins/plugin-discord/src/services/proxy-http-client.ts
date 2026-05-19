//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Layer from 'effect/Layer';

import { type EdgeHttpClient } from '@dxos/edge-client';

/**
 * Build an `@effect/platform` HttpClient layer that routes every request
 * through the authenticated edge proxy.
 *
 * Implementation note: the @effect/platform fetch client reads the `fetch`
 * function from its `FetchHttpClient.Fetch` context tag, falling back to
 * `globalThis.fetch`. Providing a layer that supplies a custom `Fetch` lets
 * us reuse the entire `FetchHttpClient.layer` machinery (request encoding,
 * response decoding, timeouts, retry composition) and only swap how the
 * underlying network call is made.
 *
 * Discord (and any other integration upstream that doesn't permit browser
 * CORS) only works in a browser via the proxy; this layer is the single
 * swap-point that makes that transparent to operation handlers.
 */
export const makeEdgeProxyHttpClientLayer = (edgeClient: EdgeHttpClient): Layer.Layer<FetchHttpClient.Fetch> =>
  Layer.succeed(FetchHttpClient.Fetch, ((input, init) => {
    const url = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url);
    return edgeClient.proxyFetch(url, init);
  }) as typeof fetch);
