//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { Graph, Node, getParentId } from '@dxos/plugin-graph';
import { isNonNullable } from '@dxos/util';

/**
 * Resolve the ancestor chain for a plank from the graph.
 *
 * Plank ids are fully-qualified graph paths (`root/<workspace>/…/<leaf>`), so the ancestor chain is
 * recovered by decomposing the id rather than walking edges — this reflects the exact path that was
 * opened (no DAG ambiguity over which parent the plank was reached from). The root segment is omitted
 * and unresolved ancestors (not yet materialized in the graph) are skipped.
 *
 * @returns Ordered nodes from the outermost ancestor to the leaf (the plank itself).
 */
export const useBreadcrumbs = (graph: Graph.ReadableGraph, id: string): Node.Node[] => {
  const atom = useMemo(
    () =>
      Atom.make((get) => {
        const ids: string[] = [];
        let current: string | undefined = id;
        while (current && current !== Node.RootId) {
          ids.unshift(current);
          current = getParentId(current);
        }

        return ids.map((nodeId) => Option.getOrElse(get(graph.node(nodeId)), () => undefined)).filter(isNonNullable);
      }),
    [graph, id],
  );

  return useAtomValue(atom);
};
