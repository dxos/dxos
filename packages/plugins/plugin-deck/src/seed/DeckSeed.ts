//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

import { resolveSeededPlanks } from '../util/layout.ts';
import { openableChildren } from '../util/openable-children.ts';
import { resolveDeckSpec } from '../util/resolve-deck-spec.ts';

/**
 * The node whose children the deck opened in its place, when `active` is exactly that seed — a
 * Collection navigated to shows its documents rather than itself, and what the user navigated to is
 * the collection, not the documents it happened to open.
 */
export const sourceOf = (graph: AppGraph.ExpandableGraph, active: readonly string[]): string | undefined => {
  const [first] = active;
  if (!first) {
    return undefined;
  }

  const [parent] = AppGraph.getConnections(graph, first, AppGraph.inverseRelation(AppGraphNode.child));
  if (!parent) {
    return undefined;
  }

  const seeded = resolveSeededPlanks({
    initial: resolveDeckSpec(parent)?.initial,
    addBesideOrigin: false,
    children: openableChildren(graph, parent.id),
  });
  return seeded?.length === active.length && seeded.every((id, index) => id === active[index]) ? parent.id : undefined;
};
