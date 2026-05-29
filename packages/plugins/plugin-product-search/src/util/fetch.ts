//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { proxyFetchLegacy } from '@dxos/edge-client';

import { type HttpRequest } from './bindRequest';

export class FetchError extends Error {}

/** Perform an HTTP request through the DXOS edge proxy and return the response body as text. */
export const fetchViaProxy = (request: HttpRequest): Effect.Effect<string, FetchError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await proxyFetchLegacy(new URL(request.url), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      if (!response.ok) {
        throw new FetchError(`HTTP ${response.status} for ${request.url}`);
      }
      return response.text();
    },
    catch: (error) => (error instanceof FetchError ? error : new FetchError(String(error))),
  });
