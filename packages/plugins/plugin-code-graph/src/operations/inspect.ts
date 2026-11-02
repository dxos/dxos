//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { CodeIndexClient } from '#client';
import { CodeGraphOperation } from '#types';

const handler: Operation.WithHandler<typeof CodeGraphOperation.Inspect> = CodeGraphOperation.Inspect.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ target, limit }) {
      const result = yield* CodeIndexClient.describe(target, limit);
      return {
        iri: result.iri,
        outgoing: (result.outgoing ?? []).map(({ predicate, object }) => ({ predicate, object })),
        incomingCounts: result.incomingCounts ?? [],
        candidates: result.candidates ?? [],
        hint: result.hint,
      };
    }),
  ),
);

export default handler;
