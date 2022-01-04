//
// Copyright 2021 DXOS.org
//

import { distance, Fraction, Point } from '@dxos/gem-x';

export type Circle = {
  x: number | Fraction
  y: number | Fraction
  r: number | Fraction
}

export type Rect = {
  x: number | Fraction
  y: number | Fraction
  width: number | Fraction
  height: number | Fraction
}

export type Line = {
  x1: number | Fraction
  y1: number | Fraction
  x2: number | Fraction
  y2: number | Fraction
}

export type PathType = 'linear' | 'basis' | 'cardinal' | 'step';

export type Path = {
  type?: PathType
  closed?: boolean
  points: [ x: number, y: number ][]
}

export type Element = {
  id: string
  type: string
  data: Circle | Rect | Line | Path
}

export type Cursor = {
  id: string // ID of element.
  type: string
  data: Circle | Rect | Line | Path
}

// TODO(burdon): Contains element.
export const createCursor = (id: string, tool: string, start?: Point, end?: Point): Cursor => {
  return createElement(id, tool, start, end);
};

/**
 * @param id
 * @param tool
 * @param start
 * @param end
 */
export const createElement = (id: string, tool: string, start?: Point, end?: Point): Element => {
  switch (tool) {
    case 'circle': {
      return {
        id,
        type: 'circle',
        data: {
          x: start[0],
          y: start[1],
          r: distance(start, end)
        }
      };
    }

    case 'rect': {
      const width = end[0] - start[0];
      const height = end[1] - start[1]

      return {
        id,
        type: 'rect',
        data: {
          x: start[0] + (width < 0 ? width : 0),
          y: start[1] + (height < 0 ? height : 0),
          width: Math.abs(width),
          height: Math.abs(height)
        }
      };
    }

    case 'line': {
      return {
        id,
        type: 'line',
        data: {
          x1: start[0],
          y1: start[1],
          x2: end[0],
          y2: end[1]
        }
      };
    }

    case 'path': {
      return {
        id,
        type: 'path',
        data: {
          points: []
        }
      }
    }
  }
};
