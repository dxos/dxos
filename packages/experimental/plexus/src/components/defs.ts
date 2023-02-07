//
// Copyright 2023 DXOS.org
//

import { Point } from '@dxos/gem-core';
import { GraphData, GraphNode } from '@dxos/gem-spore';

// TODO(burdon): Conform to gem-spore;

export interface Layout {
  center: Point;
  points: Map<string, Point>;
  update(graph: GraphData, selected?: GraphNode): void;
}

export interface Renderer {
  update(el: SVGElement, layout: Layout, data: GraphData, onClick: (node: GraphNode) => void): void; // TODO(burdon): Callbacks.
  render(el: SVGElement, layout: Layout, transition?: boolean): void;
}
