//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { CodeGraphOperation } from '#types';

const handler: Operation.WithHandler<typeof CodeGraphOperation.SetLayout> = CodeGraphOperation.SetLayout.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ graph: ref, layout, resetPositions }) {
      const graph = yield* Database.load(ref);
      Obj.update(graph, (graph) => {
        graph.layout = layout;
        if (resetPositions) {
          for (const node of graph.nodes) {
            delete node.position;
          }
        }
      });
    }),
  ),
);

export default handler;
