//
// Copyright 2020 DXOS.org
//

import type { ZoomTransform } from 'd3';
import { useMemo } from 'react';

import { Bounds, Bounds2, Frac, Fraction, Num, Point, Point2 } from '../util';

/**
 * Zoomable scale for grid.
 */
export class Scale {
  private _bounds: Bounds; // TODO(burdon): Remove.
  private _transform: ZoomTransform;

  constructor (
    private readonly _gridSize: number = 16
  ) {}

  get bounds () {
    return this._bounds;
  }

  get transform () {
    return this._transform;
  }

  get gridSize () {
    return this._gridSize;
  }

  setBounds (bounds: Bounds): Bounds {
    this._bounds = bounds;
    return this._bounds;
  }

  setTransform (transform: ZoomTransform) {
    this._transform = transform;
  }

  // TODO(burdon): Why bounds?
  // TODO(burdon): Define Point, Bounds for screen and model.

  test = () => {
    const scale = new Scale(32);
    const p1: Point2 = [0, 0];
    const p2: Point = scale.model.toPoint(p1);
    const p3: Point2 = scale.screen.toPoint(p2, true);
  }

  //
  // Map model to screen.
  //

  readonly model = {
    toValues: (values: Num[]): number[] => {
      return values.map(value => Frac.float(Frac.multiply(value, this._gridSize)));
    },

    toPoint: (point: Point2): Point => {
      const [x, y] = this.model.toValues(point);
      return [x, -y];
    },

    toBounds: ({ x, y, width, height }: Bounds2): Bounds => {
      const point = this.model.toPoint([x, y]);
      const [width2, height2] = this.model.toValues([width, height]);
      return {
        x: point[0],
        y: point[1] - height2,
        width: width2,
        height: height2
      };
    }
  }

  //
  // Map screen to model.
  //

  readonly screen = {
    toValues: (value: number, snap: boolean): Fraction => [0, 0],
    toPoint: (point: Point, snap: boolean): Point2 => [0, 0],
    toBounds: (bounds: Bounds, snap: boolean): Bounds2 => ({ x: 0, y: 0, width: 0, height: 0 })
  }

  // TODO(burdon): Remove.

  /**
   * Translate point relative to origin.
   * @param x
   * @param y
   */
  translatePoint ([x, y]: Point): Point {
    const { x: tx, y: ty, k } = this._transform || { x: 0, y: 0, k: 1 };
    const { width, height } = this._bounds;
    const [cx, cy] = [width / 2, height / 2];
    return [
      (x - cx - tx) / k,
      (y - cy - ty) / k
    ];
  }

  /**
   * Snap point to grid.
   * @param p
   */
  // TODO(burdon): More efficient?
  snap (p: Point): Point {
    const m = this.mapToModel(p, true);
    return this.mapToScreen(m) as Point;
  }

  // TODO(burdon): Treat points and bounds differently (in both directions).

  /**
   * Map model value to screen value.
   * @param array
   */
  mapToScreen (array: (Num)[]): number[] {
    return array.map(n => Frac.floor(Frac.multiply(n, this._gridSize)));
  }

  mapPointToScreen ([x, y]): Point {
    return [
      Frac.floor(Frac.multiply(x, this._gridSize)),
      -Frac.floor(Frac.multiply(y, this._gridSize))
    ];
  }

  mapBoundsToScreen ({ x, y, width, height }): Bounds {
    const h = Frac.floor(Frac.multiply(height, this._gridSize));
    return {
      x: Frac.floor(Frac.multiply(x, this._gridSize)),
      y: -Frac.floor(Frac.multiply(y, this._gridSize)) - h,
      width: Frac.floor(Frac.multiply(width, this._gridSize)),
      height: h
    };
  }

  /**
   * Map screen values to model values.
   * @param array
   * @param snap
   * @param d
   */
  mapToModel (array: number[], snap = false, d = 1): Num[] {
    if (snap) {
      return array.map(n => Frac.round(n / this._gridSize, d));
    } else {
      return array.map(n => n / this._gridSize);
    }
  }
}

// TODO(burdon): Factor out (hooks).
export const useScale = ({ gridSize = 32 }): Scale => {
  return useMemo<Scale>(() => new Scale(gridSize), []);
};
