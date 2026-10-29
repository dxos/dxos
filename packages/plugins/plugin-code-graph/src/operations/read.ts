//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { CodeGraphOperation } from '#types';

const handler: Operation.WithHandler<typeof CodeGraphOperation.Read> = CodeGraphOperation.Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ graph: ref }) {
      const graph = yield* Database.load(ref);
      return {
        layout: graph.layout ?? 'illustrator',
        nodes: graph.nodes.map(({ id, label, kind }) => ({ id, label, kind })),
        edges: graph.edges.map(({ from, to, kind }) => ({ from, to, ...(kind && { kind }) })),
      };
    }),
  ),
);

export default handler;
