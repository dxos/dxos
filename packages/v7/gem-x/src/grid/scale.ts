//
// Copyright 2020 DXOS.org
//

import type { ZoomTransform } from 'd3';
import { useMemo } from 'react';

import { Bounds, Frac, Fraction, Point, round } from '../util';

/**
 * Zoomable scale for grid.
 */
export class Scale {
  private _bounds: Bounds;
  private _transform: ZoomTransform;

  constructor (
    private readonly _gridSize: number
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

  /**
   * Map model value to screen value.
   * @param n
   */
  mapToScreen (n: number | Fraction): number {
    return Frac.floor(Frac.multiply(n, this._gridSize));
  }

  /**
   * Snap model points.
   * @param n
   */
  snap (n: (number | Fraction)[]) {
    return this.mapToModel(n.map(n => this.mapToScreen(n)), true);
  }

  /**
   * Map screen values to model values.
   * @param n
   * @param snap
   */
  // TODO(burdon): Snap to fraction!
  mapToModel (n: number[], snap?: boolean): number[] {
    if (snap) {
      return n.map(n => round(n, this._gridSize));
    } else {
      return n.map(n => n / this._gridSize);
    }
  }

  /**
   * Translate point relative to origin.
   * @param x
   * @param y
   */
  translatePoint ([x, y]: Point): Point {
    const { x: tx, y: ty, k } = this._transform || { x: 0, y: 0, k: 1 };
    const [,, width, height] = this._bounds;
    const [cx, cy] = [width / 2, height / 2];
    return [
      (x - cx - tx) / k,
      (y - cy - ty) / k
    ];
  }

  /**
   * Map screen point to model point.
   * @param point
   * @param snap
   */
  // TODO(burdon): Remove.
  mapPointToModel (point: Point, snap?: boolean): Point {
    return this.mapToModel(this.translatePoint(point), snap) as Point;
  }
}

// TODO(burdon): Factor out (hooks).
export const useScale = ({ gridSize = 32 }): Scale => {
  return useMemo<Scale>(() => new Scale(gridSize), []);
};
