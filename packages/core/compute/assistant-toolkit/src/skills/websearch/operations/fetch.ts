//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { proxyFetchLegacy } from '@dxos/edge-client/cors-proxy';

import { Fetch } from './definitions';

export default Fetch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ url }) {
      const response = yield* Effect.tryPromise({
        try: () => proxyFetchLegacy(new URL(url)),
        catch: (cause) => new Error(`Fetch failed: ${String(cause)}`),
      });
      // TODO(dmaretskyi): Use browser rendering API.
      if (!response.ok) {
        const body = yield* Effect.promise(() => response.text());
        return yield* Effect.fail(new Error(`Fetch failed with status ${response.status}: ${body.slice(0, 256)}`));
      }
      return yield* Effect.promise(() => response.text());
    }),
  ),
);
