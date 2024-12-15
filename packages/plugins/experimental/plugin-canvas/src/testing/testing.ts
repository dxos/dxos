//
// Copyright 2024 DXOS.org
//

import { range } from '@dxos/util';

import { type Graph, GraphModel, type Shape } from '../graph';
import type { Dimension, PointTransform } from '../layout';

/**
 * Add to Devtools > Sources > Snippets
 * @param id
 */
export const testElement = (id = '__TEST__') => {
  (window as any).INSPECT = () => {
    (window as any).inspect(document.getElementById(id));
  };

  return { id };
};

// TODO(burdon): Layout.
export const itemSize: Dimension = { width: 128, height: 64 };

export const createId = () => Math.random().toString(36).slice(2, 10);

export const createGraph = (snap: PointTransform): Graph => {
  const wrapper = new GraphModel();
  range(1).forEach((i) => {
    const a = createId();
    const b = createId();
    const c = createId();

    wrapper.addNode({
      id: a,
      data: {
        id: a,
        type: 'rect',
        text: 'A',
        pos: snap({ x: 0, y: 0 }),
        size: itemSize,
      } satisfies Shape,
    });

    wrapper.addNode({
      id: b,
      data: {
        id: b,
        type: 'rect',
        text: 'B',
        pos: snap({ x: -itemSize.width * 2, y: 0 }),
        size: itemSize,
      } satisfies Shape,
    });

    wrapper.addNode({
      id: c,
      data: {
        id: c,
        type: 'rect',
        text: 'C',
        pos: snap({ x: itemSize.width * 2, y: 0 }),
        size: itemSize,
      } satisfies Shape,
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
