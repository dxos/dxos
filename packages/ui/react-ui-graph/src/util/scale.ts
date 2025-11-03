//
// Copyright 2020 DXOS.org
//

import { type ZoomTransform, zoomIdentity } from 'd3';

import { FractionUtil } from './fraction';
import { type Fraction } from './fraction';
import { type Point, type Rect } from './types';
import { type Bounds, type Vertex } from './vector';

/**
 * Scale to map vector space to view (screen) space.
 */
export class Scale {
  private _transform?: ZoomTransform;

  constructor(private readonly _gridSize: number = 32) {}

  get gridSize() {
    return this._gridSize;
  }

  get transform() {
    return this._transform || zoomIdentity;
  }

  setTransform(transform: ZoomTransform): boolean {
    if (
      this._transform?.x === transform.x &&
      this._transform?.y === transform.y &&
      this._transform?.k === transform.k
    ) {
      return false;
    }

    this._transform = transform;
    return true;
  }

  /**
   * Translate a screen point to a logical point.
   * @param point
   */
  translate(point: Point): Point {
    const { x, y, k } = this._transform ?? { x: 0, y: 0, k: 1 };
    return [(point[0] - x) / k, (point[1] - y) / k];
  }

  /**
   * Map model to screen.
   * Model points are represented by fractions (to preserve precision) and use normal cartesian coordinates.
   */
  readonly model = {
    // TODO(burdon): Precision depends on scale.
    snapValues: (array: Fraction[]): Fraction[] => array.map((n) => FractionUtil.round(n)),

    snapVertex: ({ x, y }: Vertex): Vertex => {
      const [sx, sy] = this.model.snapValues([x, y]);
      return { x: sx, y: sy };
    },

    snapBounds: ({ x, y, width, height }: { x: Fraction; y: Fraction; width: Fraction; height: Fraction }): Bounds => {
      [x, y, width, height] = this.model.snapValues([x, y, width, height]);
      return { x, y, width, height };
    },

    toValue: (value: Fraction): number => Math.round(FractionUtil.toNumber(value) * this._gridSize),

    toValues: (values: Fraction[]): number[] =>
      values.map((value) => Math.round(FractionUtil.toNumber(value) * this._gridSize)),

    toPoint: (point: Vertex): Point => {
      const [x, y] = this.model.toValues([point.x, point.y]);
      return [x, y === 0 ? 0 : -y]; // Prevent -0.
    },

    toBounds: ({ x, y, width, height }: Bounds): Rect => {
      const point = this.model.toPoint({ x, y });
      const [width2, height2] = this.model.toValues([width, height]);

      return {
        x: point[0],
        y: point[1] - height2,
        width: width2,
        height: height2,
      };
    },
  };

  /**
   * Map screen to model.
   * Screen points are represented by floating numbers and use translated SVG coordinates (with the y-axis inverted).
   */
  readonly screen = {
    snapValues: (array: number[]): number[] => array.map((n) => Math.round(n / this._gridSize) * this._gridSize),

    snapPoint: ([x, y]: [number, number]): Point =>
      [x, y].map((n) => Math.round(n / this._gridSize) * this._gridSize) as Point,

    snapBounds: ({ x, y, width, height }: { x: number; y: number; width: number; height: number }): Rect => {
      [x, y, width, height] = this.screen.snapValues([x, y, width, height]);
      return { x, y, width, height };
    },

    toValue: (value: number): Fraction => FractionUtil.divide(FractionUtil.toFraction(value), [this._gridSize, 1]),

    toValues: (values: number[]): Fraction[] =>
      values.map((value) => FractionUtil.divide(FractionUtil.toFraction(value), [this._gridSize, 1])),

    toVertex: (point: Point): Vertex => {
      const [x, y] = point;
      return {
        x: FractionUtil.toFraction(x / this._gridSize),
        y: FractionUtil.toFraction(-y / this._gridSize),
      };
    },

    toBounds: (bounds: Rect): Bounds => {
      const { x, y } = this.screen.toVertex([bounds.x, bounds.y]);
      const [width, height] = this.screen.toValues([bounds.width, bounds.height]);

      return {
        x,
        y: FractionUtil.subtract(y, height),
        width,
        height,
      };
    },
  };
}
