//
// Copyright 2026 DXOS.org
//

import { type EdgeHttpClient } from '@dxos/edge-client';
import { BYOK_HEADER } from '@dxos/protocols';

/** Host stripped by {@link EdgeHttpClient.aiRequest}; only the request path reaches EDGE. */
export const EDGE_SENTINEL_ENDPOINT = 'http://edge.internal/v1/systemone';

/**
 * A `fetch` that sends System One calls through EDGE's `/ai/generate/typesafe` proxy. The vendor
 * sends no CORS headers, so this is the only route a browser has to it.
 *
 * With a connected key the call is BYOK (`X-BYOK`); without one EDGE authenticates with its platform
 * key and meters the usage against the caller's account.
 */
export const makeEdgeFetch =
  (getEdgeClient: () => Pick<EdgeHttpClient, 'aiRequest'>, apiKey: string | undefined): typeof globalThis.fetch =>
  (input, init) => {
    const request = new Request(input, init);
    const headers = new Headers(request.headers);
    // EDGE sets its own `Authorization`; the vendor key travels only as `X-BYOK`.
    headers.delete('Authorization');
    if (apiKey) {
      headers.set(BYOK_HEADER, apiKey);
    }
    return getEdgeClient().aiRequest('typesafe', new Request(request, { headers }));
  };
