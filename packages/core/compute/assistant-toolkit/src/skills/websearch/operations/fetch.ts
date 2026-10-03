//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { proxyFetchLegacy } from '@dxos/edge-client/cors-proxy';
import { BaseError } from '@dxos/errors';

import { ToolkitError } from '../../../errors.ts';
import { Fetch } from './definitions.ts';

/** The proxy fetch behind the websearch skill's `fetch` tool did not return a response. */
export class WebFetchError extends BaseError.extend('WebFetchError', 'Fetch failed.') {}

export default Fetch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ url }) {
      const response = yield* Effect.tryPromise({
        try: () => proxyFetchLegacy(new URL(url)),
        catch: (cause) => new WebFetchError({ cause }),
      });
      // TODO(dmaretskyi): Use browser rendering API.
      if (!response.ok) {
        const body = yield* Effect.promise(() => response.text());
        return yield* Effect.fail(
          new ToolkitError({ message: `Fetch failed with status ${response.status}: ${body.slice(0, 256)}` }),
        );
      }
      return yield* Effect.promise(() => response.text());
    }),
  ),
);
