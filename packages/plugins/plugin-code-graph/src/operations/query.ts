//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { CodeIndexClient } from '#client';
import { CodeGraphOperation } from '#types';

const handler: Operation.WithHandler<typeof CodeGraphOperation.Query> = CodeGraphOperation.Query.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sparql, limit }) {
      const { vars, rows, truncated } = yield* CodeIndexClient.query(sparql, limit);
      return { vars, rows, truncated };
    }),
  ),
);

export default handler;
