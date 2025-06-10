//
// Copyright 2025 DXOS.org
//

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphProjectorOptions } from './graph-projector';
import { GraphRadialProjector } from './graph-radial-projector';

export type GraphHierarchyProjectorOptions = GraphProjectorOptions & {
  radius?: number;
  margin?: number;
  duration?: number;
};

export class GraphHierarchyProjector<
  NodeData = any,
  Options extends GraphHierarchyProjectorOptions = any,
> extends GraphRadialProjector<NodeData, Options> {
  protected override onUpdate(graph?: Graph) {
    log.info('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    super.onUpdate(graph);
  }
}
