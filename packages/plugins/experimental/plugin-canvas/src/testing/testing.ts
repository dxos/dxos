//
// Copyright 2024 DXOS.org
//

import { range } from '@dxos/util';

import { createRect, type Graph, GraphModel, type Node, type Shape } from '../graph';
import type { Dimension, PointTransform } from '../layout';

export const itemSize: Dimension = { width: 128, height: 64 };

export const createId = () => Math.random().toString(36).slice(2, 10);

export const createGraph = (snap: PointTransform = (p) => p): Graph => {
  const graph = new GraphModel<Node<Shape>, any>();
  range(1).forEach((i) => {
    const a = createId();
    const b = createId();
    const c = createId();
    const d = createId();

    graph.addNode({
      id: a,
      data: createRect({
        id: a,
        pos: snap({ x: 0, y: 0 }),
        size: itemSize,
        text: 'A',
      }),
    });

    graph.addNode({
      id: b,
      data: createRect({
        id: b,
        pos: snap({ x: -itemSize.width * 2, y: 0 }),
        size: itemSize,
        text: 'B',
      }),
    });

    graph.addNode({
      id: c,
      data: createRect({
        id: c,
        pos: snap({ x: itemSize.width * 2, y: 0 }),
        size: itemSize,
        text: 'C',
      }),
    });

    graph.addNode({
      id: d,
      data: createRect({
        id: d,
        pos: snap({ x: 0, y: 128 }),
        size: itemSize,
        text: 'D',
      }),
    });

    graph.addEdge({
      id: createId(),
      source: a,
      target: b,
      data: {},
    });

    graph.addEdge({
      id: createId(),
      source: a,
      target: c,
      data: {},
    });

    graph.addEdge({
      id: createId(),
      source: a,
      target: d,
      data: {},
    });
  });

  return graph.graph;
};
