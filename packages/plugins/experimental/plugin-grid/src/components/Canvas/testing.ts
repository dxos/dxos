//
// Copyright 2024 DXOS.org
//

import { range } from '@dxos/util';

import type { Dimension, PointTransform } from './geometry';
import { type Graph, GraphWrapper } from '../../graph';

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
        pos: snap({ x: 0, y: 0 }),
        size,
      },
    });

    wrapper.addNode({
      id: b,
      data: {
        id: b,
        pos: snap({ x: -128, y: 0 }),
        size,
      },
    });

    wrapper.addNode({
      id: c,
      data: {
        id: c,
        pos: snap({ x: 128, y: 0 }),
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
