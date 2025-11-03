//
// Copyright 2024 DXOS.org
//

import { easeSinOut, interpolate, interpolateObject, transition } from 'd3';
import {
  type Matrix,
  applyToPoints,
  compose,
  identity,
  inverse,
  scale as scaleMatrix,
  translate as translateMatrix,
} from 'transformation-matrix';

import { type Dimension, type Point } from '../types';

export const defaultOrigin: Point = { x: 0, y: 0 };

// TODO(burdon): Rotation also?
export type ProjectionState = {
  scale: number;
  offset: Point;
};

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
  private _offset: Point = defaultOrigin;
  private _toScreen: Matrix = identity();
  private _toModel: Matrix = identity();

  constructor(bounds?: Dimension, scale?: number, offset?: Point) {
    if (bounds && scale && offset) {
      this.update(bounds, scale, offset);
    }
  }

  update(bounds: Dimension, scale: number, offset: Point): this {
    this._bounds = bounds;
    this._scale = scale;
    this._offset = offset;
    this._toScreen = compose(
      // NOTE: Order is important.
      translateMatrix(this._offset.x, this._offset.y),
      scaleMatrix(this._scale),
      // TODO(burdon): Flip.
      // flipX(),
    );
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
}: ProjectionState & { pos: Point; newScale: number }): ProjectionState => ({
  scale: newScale,
  offset: {
    x: pos.x - (pos.x - offset.x) * (newScale / scale),
    y: pos.y - (pos.y - offset.y) * (newScale / scale),
  },
});

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
  const is = interpolate(current, next);
  transition()
    .ease(easeSinOut)
    .duration(delay)
    .tween('zoom', () => (t) => {
      const newScale = is(t);
      setTransform(getZoomTransform({ scale: current, newScale, offset, pos }));
    });
};

const noop = () => {};

/**
 * Zoom to new scale and position.
 */
// TODO(burdon): Convert to object.
export const zoomTo = (
  setTransform: (state: ProjectionState) => void,
  current: ProjectionState,
  next: ProjectionState,
  delay = 200,
  cb = noop,
) => {
  const is = interpolateObject({ scale: current.scale, ...current.offset }, { scale: next.scale, ...next.offset });
  transition()
    .ease(easeSinOut)
    .duration(delay)
    .tween('zoom', () => (t) => {
      const { scale, x, y } = is(t);
      setTransform({ scale, offset: { x, y } });
    })
    .on('end', cb);
};
