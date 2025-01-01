//
// Copyright 2024 DXOS.org
//

import { type Point } from '@antv/layout';

import { type Anchor } from '../components';
import { type Polygon } from '../types';

export const rowHeight = 20;

export const createAnchorId = (direction: 'input' | 'output', property = 'value') => [direction, property].join('.');

export const parseAnchorId = (id: string): ['input' | 'output' | undefined, string] => {
  const parts = id.match(/(input|output)\.(.+)/);
  return parts ? (parts.slice(1) as any) : [undefined, id];
};

export const getAnchorPoints = (center: Point, n: number) => {
  const h = (n - 1) * rowHeight;
  return [...Array(n)].map((_, i) => ({ x: center.x, y: center.y - h / 2 + i * rowHeight }));
};

/**
 * Create anchor points.
 */
export const createAnchors = ({
  shape,
  inputs,
  outputs,
  center = shape.center,
}: {
  shape: Polygon;
  inputs: string[];
  outputs: string[];
  center?: Point;
}): Record<string, Anchor> => {
  const { id, size } = shape;

  const hi = (inputs.length - 1) * rowHeight;
  const i = inputs.reduce(
    (map, anchor, i) => ({
      ...map,
      [anchor]: {
        id: anchor,
        shape: id,
        pos: {
          x: center.x - size.width / 2,
          y: center.y - hi / 2 + i * rowHeight,
        },
      },
    }),
    {},
  );

  const ho = (outputs.length - 1) * rowHeight;
  const o = outputs.reduce(
    (map, anchor, i) => ({
      ...map,
      [anchor]: {
        id: anchor,
        shape: id,
        pos: {
          x: center.x + size.width / 2,
          y: center.y - ho / 2 + i * rowHeight,
        },
      },
    }),
    {},
  );

  return { ...i, ...o };
};
