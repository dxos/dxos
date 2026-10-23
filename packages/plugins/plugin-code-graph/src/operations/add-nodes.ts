//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Iri, Model } from '#graph';
import { CodeGraphOperation } from '#types';

import { addPatch, connecting } from './util.ts';

const handler: Operation.WithHandler<typeof CodeGraphOperation.AddNodes> = CodeGraphOperation.AddNodes.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ graph: ref, nodes, connect = true }) {
      const graph = yield* Database.load(ref);
      const iris = nodes.map(Iri.expand);
      const edges = connect
        ? yield* connecting([...new Set([...graph.nodes.map(({ id }) => id), ...iris])])
        : undefined;
      return yield* addPatch(graph, { nodes: iris.map((iri) => Model.makeNode(iri)), edges: edges?.edges ?? [] });
    }),
  ),
);

export default handler;
