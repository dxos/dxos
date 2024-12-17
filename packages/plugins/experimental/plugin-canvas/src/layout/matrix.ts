//
// Copyright 2024 DXOS.org
//

import { applyToPoints, inverse, translate, compose, scale } from 'transformation-matrix';

import { type Point } from './geometry';

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
