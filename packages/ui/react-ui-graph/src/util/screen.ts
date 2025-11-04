//
// Copyright 2020 DXOS.org
//

import { type Point, type Rect } from './types';

export type Modifiers = {
  center?: boolean;
  constrain?: boolean;
};

export class Screen {
  static createBounds = ([x1, y1]: Point, [x2, y2]: Point, mod: Modifiers = {}): Rect => {
    const { constrain, center } = mod;

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);

    let width = Math.abs(x2 - x1);
    let height = Math.abs(y2 - y1);
    if (constrain) {
      width = height = Math.max(width, height);
    }

    if (center) {
      return {
        x: x - width,
        y: y - height,
        width: width * 2,
        height: height * 2,
      };
    } else {
      return {
        x,
        y,
        width,
        height,
      };
    }
  };

  static center = ({ x, y, width, height }: Rect): Point => [x + width / 2, y + height / 2];

  static contains = (bounds: Rect, point: Point): boolean => {
    const [x, y] = point;

    if (x < bounds.x || y < bounds.y) {
      return false;
    }

    if (x > bounds.x + bounds.width || y > bounds.y + bounds.height) {
      return false;
    }

    return true;
  };

  /**
   * Distance between two points.
   * @param p1
   * @param p2
   */
  static len = (p1: Point, p2: Point) =>
    Math.sqrt(Math.pow(Math.abs(p1[0] - p2[0]), 2) + Math.pow(Math.abs(p1[1] - p2[1]), 2));

  /**
   * Distance to line segment.
   * https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment#1501725
   * @param v1
   * @param v2
   * @param p
   */
  static normal = (v1: Point, v2: Point, p: Point) => {
    const d2 = (p1: Point, p2: Point) => Math.pow(Math.abs(p1[0] - p2[0]), 2) + Math.pow(Math.abs(p1[1] - p2[1]), 2);

    let d: number;
    const len2 = d2(v1, v2);
    if (len2 === 0) {
      d = d2(p, v1);
    } else {
      let t = ((p[0] - v1[0]) * (v2[0] - v1[0]) + (p[1] - v1[1]) * (v2[1] - v1[1])) / len2;
      t = Math.max(0, Math.min(1, t));
      d = d2(p, [v1[0] + t * (v2[0] - v1[0]), v1[1] + t * (v2[1] - v1[1])]);
    }

    return Math.sqrt(d);
  };
}
