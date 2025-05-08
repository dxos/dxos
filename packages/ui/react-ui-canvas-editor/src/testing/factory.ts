//
// Copyright 2024 DXOS.org
//

import { type Dimension } from '@dxos/react-ui-canvas';
import { range } from '@dxos/util';

import { type PointTransform } from '../layout';
import { createRectangle } from '../shapes';
import { CanvasGraphModel } from '../types';

export const itemSize: Dimension = { width: 128, height: 64 };

export const createId = () => Math.random().toString(36).slice(2, 10);

export const createGraph = (snap: PointTransform = (p) => p): CanvasGraphModel => {
  const graph = CanvasGraphModel.create();

  range(1).forEach((i) => {
    const a = createId();
    const b = createId();
    const c = createId();
    const d = createId();

    graph.addNode(
      createRectangle({
        id: a,
        center: snap({ x: 0, y: 0 }),
        size: itemSize,
        text: 'A',
      }),
    );

    graph.addNode(
      createRectangle({
        id: b,
        center: snap({ x: -itemSize.width * 2, y: 0 }),
        size: itemSize,
        text: 'B',
      }),
    );

    graph.addNode(
      createRectangle({
        id: c,
        center: snap({ x: itemSize.width * 2, y: 0 }),
        size: itemSize,
        text: 'C',
      }),
    );

    graph.addNode(
      createRectangle({
        id: d,
        center: snap({ x: 0, y: 128 }),
        size: itemSize,
        text: 'D',
      }),
    );

    graph.addEdge({ id: createId(), source: a, target: b });
    graph.addEdge({ id: createId(), source: a, target: c });
    graph.addEdge({ id: createId(), source: a, target: d });
  });

  return graph;
};
