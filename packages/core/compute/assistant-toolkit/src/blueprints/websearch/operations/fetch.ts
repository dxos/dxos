//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { proxyFetchLegacy } from '@dxos/edge-client';

import { Fetch } from './definitions';

export default Fetch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ url }) {
      const response = yield* Effect.promise(() => proxyFetchLegacy(new URL(url)).then((response) => response.text()));
      return response;
    }),
  ),
);
