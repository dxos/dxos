//
// Copyright 2024 DXOS.org
//

import { range } from '@dxos/util';

import { type Graph, GraphWrapper } from '../graph';
import type { Dimension, PointTransform } from '../layout';

export const createId = () => Math.random().toString(36).slice(2, 10);

export const createGraph = (size: Dimension, snap: PointTransform): Graph => {
  const wrapper = new GraphWrapper();
  range(1).forEach((i) => {
    const a = createId();
    const b = createId();
    const c = createId();

    wrapper.addNode({
      id: a,
      data: {
        id: a,
        text: 'A',
        pos: snap({ x: 0, y: 0 }),
        size,
      },
    });

    wrapper.addNode({
      id: b,
      data: {
        id: b,
        text: 'B',
        pos: snap({ x: -size.width * 2, y: 0 }),
        size,
      },
    });

    wrapper.addNode({
      id: c,
      data: {
        id: c,
        text: 'C',
        pos: snap({ x: size.width * 2, y: 0 }),
        size,
      },
    });

    wrapper.addEdge({
      id: createId(),
      source: a,
      target: b,
      data: {},
    });

    wrapper.addEdge({
      id: createId(),
      source: a,
      target: c,
      data: {},
    });
  });

  return wrapper.graph;
};
