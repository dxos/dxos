//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import {
  type Matrix,
  applyToPoints,
  compose,
  inverse,
  translate as translateMatrix,
  identity,
  scale as scaleMatrix,
} from 'transformation-matrix';

import { type Point, type Dimension } from '../types';

export const defaultOffset: Point = { x: 0, y: 0 };

// TODO(burdon): Rotation also?
export type ProjectionState = {
  scale: number;
  offset: Point;
};

// TODO(burdon): Tradeoff between stable ProjectionMapping object that can be used with live values within a closure,
//  vs. a reactive object that can trigger updates?

/**
 * Maps between screen and model coordinates.
 */
export interface Projection {
  get bounds(): Dimension;
  get scale(): number;
  get offset(): Point;

  /**
   * Maps the model space to the screen offset (from the top-left of the element).
   */
  toScreen(points: Point[]): Point[];

  /**
   * Maps the pointer coordinate (from the top-left of the element) to the model space.
   */
  toModel(points: Point[]): Point[];
}

export class ProjectionMapper implements Projection {
  private _bounds: Dimension = { width: 0, height: 0 };
  private _scale: number = 1;
  private _offset: Point = defaultOffset;
  private _toScreen: Matrix = identity();
  private _toModel: Matrix = identity();

  constructor(bounds?: Dimension, scale?: number, offset?: Point) {
    if (bounds && scale && offset) {
      this.update(bounds, scale, offset);
    }
  }

  update(bounds: Dimension, scale: number, offset: Point) {
    this._bounds = bounds;
    this._scale = scale;
    this._offset = offset;
    this._toScreen = compose(translateMatrix(this._offset.x, this._offset.y), scaleMatrix(this._scale));
    this._toModel = inverse(this._toScreen);
    return this;
  }

  get bounds() {
    return this._bounds;
  }

  get scale() {
    return this._scale;
  }

  get offset() {
    return this._offset;
  }

  toScreen(points: Point[]): Point[] {
    return applyToPoints(this._toScreen, points);
  }

  toModel(points: Point[]): Point[] {
    return applyToPoints(this._toModel, points);
  }
}

/**
 * Maintain position while zooming.
 */
export const getZoomTransform = ({
  scale,
  offset,
  pos,
  newScale,
}: ProjectionState & { pos: Point; newScale: number }): ProjectionState => {
  return {
    scale: newScale,
    offset: {
      x: pos.x - (pos.x - offset.x) * (newScale / scale),
      y: pos.y - (pos.y - offset.y) * (newScale / scale),
    },
  };
};

/**
 * Zoom while keeping the specified position in place.
 */
// TODO(burdon): Convert to object.
export const zoomInPlace = (
  setTransform: (state: ProjectionState) => void,
  pos: Point,
  offset: Point,
  current: number,
  next: number,
  delay = 200,
) => {
  const is = d3.interpolate(current, next);
  d3.transition()
    .ease(d3.easeSinOut)
    .duration(delay)
    .tween('zoom', () => (t) => {
      const newScale = is(t);
      setTransform(getZoomTransform({ scale: current, newScale, offset, pos }));
    });
};

/**
 * Zoom to new scale and position.
 */
// TODO(burdon): Convert to object.
export const zoomTo = (
  setTransform: (state: ProjectionState) => void,
  current: ProjectionState,
  next: ProjectionState,
  delay = 200,
) => {
  const is = d3.interpolateObject({ scale: current.scale, ...current.offset }, { scale: next.scale, ...next.offset });
  d3.transition()
    .ease(d3.easeSinOut)
    .duration(delay)
    .tween('zoom', () => (t) => {
      const { scale, x, y } = is(t);
      setTransform({ scale, offset: { x, y } });
    });
};
