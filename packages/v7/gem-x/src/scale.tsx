//
// Copyright 2020 DXOS.org
//

import type { ZoomTransform } from 'd3';
import { useMemo } from 'react';

import { Frac, Num } from './frac';

export type Point = [x: number, y: number];

export class Bounds {
  private _x: number
  private _y: number
  private _width: number
  private _height: number

  get bounds () {
    return {
      x: this._x,
      y: this._y,
      width: this._width,
      height: this._height
    }
  }

  get center () {
    return {
      x: this._width / 2,
      y: this._height / 2,
    }
  }

  update (x: number, y: number, width: number, height: number) {
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;

    return this.bounds;
  }
}

const round = (n: number, s: number) => {
  return Math.round((n + 0.5) / s);
};

export class Scale {
  private _bounds: Bounds = new Bounds();
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

  setTransform (transform: ZoomTransform) {
    this._transform = transform;
  }

  mapToScreen (n: number | Num) {
    return Frac.floor(Frac.x(n, this._gridSize));
  }

  mapToModel ([ x, y ], snap?: boolean): Point {
    const { center } = this._bounds;
    const { x: tx, y: ty, k } = this._transform || { x: 0, y: 0, k: 1 };
    const pos = [
      (x - center.x - tx) / k,
      (center.y - y - ty) / k
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

export const useScale = ({ gridSize }): Scale => {
  return useMemo<Scale>(() => new Scale(gridSize), []);
}
