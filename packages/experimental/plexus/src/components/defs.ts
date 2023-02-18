//
// Copyright 2023 DXOS.org
//

import { Point } from '@dxos/gem-core';
import { GraphData } from '@dxos/gem-spore';

// TODO(burdon): Conform to gem-spore;

export interface Layout<N> {
  center: Point;
  points: Map<string, Point>;
  update(graph: GraphData<N>, selected?: N): void;
}

export interface Renderer<N> {
  update(el: SVGElement, layout: Layout<N>, data: GraphData<N>, onClick: (node: N) => void): void; // TODO(burdon): Callbacks.
  render(el: SVGElement, layout: Layout<N>, transition?: boolean): void;
}
