//
// Copyright 2020 DXOS.org
//

import type { ZoomTransform } from 'd3';

import { Fraction, FractionUtil } from './fraction';
import { ViewBounds, Point } from './screen';
import { Bounds, Vertex } from './vector';

/**
 * Scale to map vector space to view (screen) space.
 */
export class Scale {
  private _bounds: ViewBounds; // TODO(burdon): Remove.
  private _transform: ZoomTransform; // TODO(burdon): Remove.

  constructor (
    private readonly _gridSize: number = 16
  ) {}

  get gridSize () {
    return this._gridSize;
  }

  // TODO(burdon): Remove.
  get bounds () {
    return this._bounds;
  }

  // TODO(burdon): Remove.
  get transform () {
    return this._transform;
  }

  // TODO(burdon): Remove.
  setBounds (bounds: ViewBounds): ViewBounds {
    this._bounds = bounds;
    return this._bounds;
  }

  // TODO(burdon): Remove.
  setTransform (transform: ZoomTransform) {
    this._transform = transform;
  }

  //
  // Map model to screen.
  //

  readonly model = {
    toValues: (values: Fraction[]): number[] => {
      return values.map(value => Math.round(FractionUtil.toNumber(value) * this._gridSize));
    },

    toPoint: (point: Vertex): Point => {
      const [x, y] = this.model.toValues([point.x, point.y]);
      return [x, y === 0 ? 0 : -y]; // Prevent -0.
    },

    toBounds: ({ x, y, width, height }: Bounds): ViewBounds => {
      const point = this.model.toPoint({ x, y });
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
    // TODO(burdon): Depends on k transform.
    snap: (array: number[]) => array.map(n => Math.round(n / this._gridSize) * this._gridSize),

    snapPoint: ([x, y]): Point => [x, y].map(n => Math.round(n / this._gridSize) * this._gridSize) as Point,

    toValues: (values: number[]): Fraction[] => {
      return values.map(value => FractionUtil.divide(FractionUtil.toFraction(value), [1, this._gridSize]));
    },

    toVertex: (point: Point): Vertex => {
      const [x, y] = point;
      return {
        x: FractionUtil.toFraction(x / this._gridSize),
        y: FractionUtil.toFraction(-y / this._gridSize)
      };
    },

    toBounds: (bounds: ViewBounds): Bounds => {
      const { x, y, width, height } = bounds;
      return {
        ...this.screen.toVertex([x, y]),
        width: FractionUtil.toFraction(width / this._gridSize),
        height: FractionUtil.toFraction(height / this._gridSize)
      };
    }
  }
}
