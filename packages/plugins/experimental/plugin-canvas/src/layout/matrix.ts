//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import { applyToPoints, inverse, translate, compose, scale } from 'transformation-matrix';

import { type Point } from './geometry';
import { type TransformState } from '../hooks';

// TODO(burdon): Create class.

/**
 * Maps the model space to the screen offset (from the top-left of the element).
 */
export const modelToScreen = (s: number, offset: Point, points: Point[]): Point[] => {
  const matrix = compose(translate(offset.x, offset.y), scale(s));
  return applyToPoints(matrix, points);
};

/**
 * Maps the pointer coordinate (from the top-left of the element) to the model space.
 */
export const screenToModel = (s: number, offset: Point, points: Point[]): Point[] => {
  const matrix = inverse(compose(translate(offset.x, offset.y), scale(s)));
  return applyToPoints(matrix, points);
};

//
// Transformations.
//

/**
 * Maintain position while zooming.
 */
export const getZoomTransform = ({
  scale,
  offset,
  pos,
  newScale,
}: TransformState & { pos: Point; newScale: number }): TransformState => {
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
export const zoomInPlace = (
  setTransform: (state: TransformState) => void,
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
export const zoomTo = (
  setTransform: (state: TransformState) => void,
  current: TransformState,
  next: TransformState,
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
