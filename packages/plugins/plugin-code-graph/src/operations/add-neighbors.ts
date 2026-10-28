//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Iri, type Model } from '#graph';
import { CodeGraphOperation } from '#types';

import { addPatch, neighbours } from './util.ts';

const DEFAULT_LIMIT = 25;

const handler: Operation.WithHandler<typeof CodeGraphOperation.AddNeighbors> = CodeGraphOperation.AddNeighbors.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ graph: ref, nodes, direction = 'out', predicate, limit = DEFAULT_LIMIT }) {
      const graph = yield* Database.load(ref);
      const directions = direction === 'both' ? (['out', 'in'] as const) : [direction];
      const patches = yield* Effect.forEach(
        nodes.map(Iri.expand).flatMap((iri) => directions.map((side) => ({ iri, side }))),
        ({ iri, side }) =>
          neighbours(iri, predicate ?? (Iri.kindOf(iri) === 'package' ? 'usesPackage' : 'imports'), side, limit),
        { concurrency: 4 },
      );
      const patch: Model.Patch = {
        nodes: patches.flatMap(({ nodes }) => nodes),
        edges: patches.flatMap(({ edges }) => edges),
      };
      return yield* addPatch(graph, patch);
    }),
  ),
);

export default handler;
