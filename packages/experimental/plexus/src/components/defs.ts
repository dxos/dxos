//
// Copyright 2023 DXOS.org
//

import { type Point } from '@dxos/gem-core';
import { type Graph } from '@dxos/graph';

export interface Layout<N> {
  center: Point;
  points: Map<string, Point>;
  update(graph: Graph, selected?: N): void;
}

export interface Renderer<N> {
  update(el: SVGElement, layout: Layout<N>, data: Graph, onClick: (node: N) => void): void; // TODO(burdon): Callbacks.
  render(el: SVGElement, layout: Layout<N>, transition?: boolean): void;
}
