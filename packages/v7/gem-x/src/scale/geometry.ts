//
// Copyright 2020 DXOS.org
//

export type Point = [x: number, y: number];

/**
 * Distance between two points.
 * @param p1
 * @param p2
 */
export const distance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(Math.abs(p1[0] - p2[0]), 2) + Math.pow(Math.abs(p1[1] - p2[1]), 2));
};

/**
 * Distance to line segment.
 * https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment#1501725
 * @param v1
 * @param v2
 * @param p
 */
export const normal = (v1: Point, v2: Point, p: Point) => {
  const d2 = (p1: Point, p2: Point) => Math.pow(Math.abs(p1[0] - p2[0]), 2) + Math.pow(Math.abs(p1[1] - p2[1]), 2);

  let d;
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

/**
 * Rectangular region.
 */
export class Bounds {
  constructor (
    private _x: number = 0,
    private _y: number = 0,
    private _width: number = 0,
    private _height: number = 0
  ) {}

  get bounds () {
    return {
      x: this._x,
      y: this._y,
      width: this._width,
      height: this._height
    };
  }

  // TODO(burdon): Bug: used by viewbox.
  get center () {
    return {
      x: /* this._x + */ this._width / 2,
      y: /* this._y + */ this._height / 2
    };
  }

  update (x: number, y: number, width: number, height: number) {
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
    return this.bounds;
  }
}
