//
// Copyright 2026 DXOS.org
//

import { type Graph, type GraphModel } from '@dxos/graph';

/**
 * Subscribe to a ReactiveGraphModel; returns an unsubscribe.
 */
export const subscribeModel = <N extends Graph.Node.Any, E extends Graph.Edge.Any>(
  model: GraphModel.ReactiveGraphModel<N, E>,
  onChange: (graph: Graph.Graph<N, E>) => void,
): (() => void) => {
  // Fire once so the engine sees current state.
  onChange(model.graph);
  return model.subscribe(() => onChange(model.graph));
};
