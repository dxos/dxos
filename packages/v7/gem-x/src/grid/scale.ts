//
// Copyright 2020 DXOS.org
//

import type { ZoomTransform } from 'd3';
import { useMemo } from 'react';

import { Bounds, Frac, Fraction, Point, Size } from '../util';

const round = (n: number, s: number) => {
  return Math.round((n + 0.5) / s);
};

/**
 *
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

  mapToScreen (n: number | Fraction) {
    return Frac.floor(Frac.multiply(n, this._gridSize));
  }

  // TODO(burdon): Hack. Separate out scaling/snapping from centering.
  mapSizeToModel ([width, height]: Size, snap?: boolean): Size {
    if (snap) {
      return [
        round(width, this._gridSize),
        round(height, this._gridSize)
      ];
    } else {
      return [
        width / this._gridSize,
        height / this._gridSize
      ];
    }
  }

  mapToModel ([x, y]: Point, snap?: boolean): Point {
    const { x: tx, y: ty, k } = this._transform || { x: 0, y: 0, k: 1 };

    const [,, width, height] = this._bounds;
    const [cx, cy] = [width / 2, height / 2];
    const pos = [
      (x - cx - tx) / k,
      (y - cy - ty) / k
    ];

    if (snap) {
      return [
        round(pos[0], this._gridSize),
        round(pos[1], this._gridSize)
      ];
    } else {
      return [
        pos[0] / this._gridSize,
        pos[1] / this._gridSize
      ];
    }
  }
}

export const defaultScale = new Scale(32);

// TODO(burdon): Factor out (hooks).
export const useScale = ({ gridSize }): Scale => {
  return useMemo<Scale>(() => new Scale(gridSize), []);
};
