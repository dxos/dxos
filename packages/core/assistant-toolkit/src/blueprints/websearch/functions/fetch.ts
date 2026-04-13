//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Fetch } from './definitions';

export default Fetch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ url }) {
      const response = yield* Effect.promise(() => fetch(url).then((response) => response.text()));
      return response;
    }),
  ),
);
