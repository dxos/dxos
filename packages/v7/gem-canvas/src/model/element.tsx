//
// Copyright 2021 DXOS.org
//

import { createBounds, distance, Frac, Fraction, Point } from '@dxos/gem-x';

export type Circle = {
  cx: number | Fraction
  cy: number | Fraction
  r: number | Fraction
}

export type Ellipse = {
  cx: number | Fraction
  cy: number | Fraction
  rx: number | Fraction
  ry: number | Fraction
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

export type ElementDataType = Circle | Ellipse | Rect | Line | Path;

// NOTE: Different from tool type.
export type ElementType = 'circle' | 'ellipse' | 'rect' | 'line' | 'path';

export type Element = {
  id: string
  type: ElementType
  data: ElementDataType
}

export type Cursor = {
  element?: Element
  bounds: Rect
}

export const createCursor = (element?: Element, start?: Point, end?: Point): Cursor => {
  if (element) {
    const { x, y, width, height } = getBounds(element);
    const [dx, dy] = (start && end) ? [end[0] - start[0], end[1] - start[1]] : [0, 0];

    return {
      element,
      bounds: {
        x: Frac.add(x, dx),
        y: Frac.add(y, dy),
        width,
        height
      }
    };
  } else {
    return {
      bounds: createBounds(start, end)
    };
  }
};

// TODO(burdon): Use Rect (as fractions).
export const moveElement = (element: Element, [dx, dy]: Point): Element => {
  switch (element.type) {
    case 'rect': {
      const { x, y, width, height } = element.data as Rect;
      return {
        ...element,
        data: {
          x: Frac.add(x, dx),
          y: Frac.add(y, dy),
          width,
          height
        }
      };
    }

    default: {
      throw new Error(`Invalid type: ${element.type}`);
    }
  }
}

export const getBounds = (element: Element): Rect => {
  switch (element.type) {
    case 'rect': {
      return element.data as Rect;
    }

    default: {
      throw new Error(`Invalid type: ${element.type}`);
    }
  }
}

/**
 * @param id
 * @param type
 * @param start
 * @param current
 */
// TODO(burdon): Use Rect (as fractions).
export const createElement = (id: string, type: ElementType, start?: Point, current?: Point): Element => {
  switch (type) {
    case 'circle': {
      return {
        id,
        type,
        data: {
          cx: start[0],
          cy: start[1],
          r: distance(start, current)
        }
      };
    }

    case 'rect': {
      const width = current[0] - start[0];
      const height = current[1] - start[1]

      return {
        id,
        type,
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
        type,
        data: {
          x1: start[0],
          y1: start[1],
          x2: current[0],
          y2: current[1]
        }
      };
    }

    case 'path': {
      return {
        id,
        type,
        data: {
          points: []
        }
      }
    }

    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
