//
// Copyright 2024 DXOS.org
//

import { range } from '@dxos/util';

import type { Dimension, PointTransform } from './geometry';
import { type Graph, GraphWrapper } from './graph';

export const createId = () => Math.random().toString(36).slice(2, 10);

export const createGraph = (snap: PointTransform, size: Dimension): Graph => {
  const wrapper = new GraphWrapper();
  range(1).forEach((i) => {
    const id = createId();
    wrapper.addNode({
      id,
      data: {
        id,
        pos: snap({ x: 0, y: 0 }),
        size,
      },
    });
  });

  return wrapper.graph;
};
