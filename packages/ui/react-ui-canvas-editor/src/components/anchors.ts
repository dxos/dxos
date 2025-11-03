//
// Copyright 2024 DXOS.org
//

import { type Point } from '@dxos/react-ui-canvas';

import { type Polygon } from '../types';

export const rowHeight = 20;

export type Anchor = {
  /** Id (e.g., property). */
  id: string;
  /** Parent shape id. */
  shape: string;
  /** Anchor center. */
  pos: Point;
  /** Data type. */
  type?: string;
};

export const getAnchorPoints = (center: Point, n: number): Point[] => {
  const h = (n - 1) * rowHeight;
  return [...Array(n)].map((_, i) => ({ x: center.x, y: center.y - h / 2 + i * rowHeight }));
};

export const defaultAnchors: Record<string, Point> = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
  e: { x: 1, y: 0 },
};

export const resizeAnchors: Record<string, Point> = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
  e: { x: 1, y: 0 },
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  sw: { x: -1, y: 1 },
  se: { x: 1, y: 1 },
};

export const resizeCursor: Record<string, string> = {
  n: 'cursor-ns-resize',
  s: 'cursor-ns-resize',
  w: 'cursor-ew-resize',
  e: 'cursor-ew-resize',
  nw: 'cursor-nwse-resize',
  ne: 'cursor-nesw-resize',
  sw: 'cursor-nesw-resize',
  se: 'cursor-nwse-resize',
};

export const createAnchorMap = (
  { id, size: { width, height } }: Polygon,
  anchors: Record<string, Point> = defaultAnchors,
): Record<string, Anchor> =>
  Object.entries(anchors).reduce(
    (map, [anchor, { x, y }]) => {
      map[anchor] = {
        id: anchor,
        shape: id,
        pos: { x: (x * width) / 2, y: (y * height) / 2 },
      };

      return map;
    },
    {} as Record<string, Anchor>,
  );

export const createAnchors = ({
  shape,
  inputs,
  outputs,
  center = { x: 0, y: 0 },
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
