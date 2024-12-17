//
// Copyright 2024 DXOS.org
//

import { applyToPoints, inverse, translate, compose, scale } from 'transformation-matrix';

import { type Point, pointAdd, pointSubtract } from './geometry';

//
// Transform
// TODO(burdon): Create class.
// Screen vs. model transforms.
//

/**
 * Maps the model space to the screen offset (from the top-left of the element).
 */
export const modelToScreen = (s: number, offset: Point, points: Point[]): Point[] => {
  const m = compose(translate(offset.x, offset.y), scale(s));
  return applyToPoints(m, points);
};

/**
 * Maps the pointer coordinate (from the top-left of the element) to the model space.
 */
export const screenToModel = (s: number, offset: Point, points: Point[]): Point[] => {
  const m = inverse(compose(translate(offset.x, offset.y), scale(s)));
  return applyToPoints(m, points);
};

// export const screenToModel = (s: number, offset: Point, points: Point[]): Rect => {
//   const m = inverse(compose(translate(offset.x, offset.y), scale(s)));
//   const [{ x: x1, y: y1 }, { x: width1, y: height1 }] = applyToPoints(m, [
//     { x, y },
//     { x: x + width, y: y + height },
//   ]);
//
//   return { x: x1, y: y1, width: width1 - x1, height: height1 - y1 };
// };

/**
 * Maps the pointer to the element's transformed coordinate system, taking account of the starting offset
 * from the shape's reference point (typically the center).
 *
 * @param scale Container scale.
 * @param offset Container offset.
 * @param center Center point of shape.
 * @param initial Cursor position on start of drag.
 * @param current Current position.
 */
export const boundsToModelWithOffset = (
  scale: number,
  offset: Point,
  center: Point,
  initial: Point,
  current: Point,
) => {
  const initialPoint = screenToModel(scale, offset, initial);
  const currentPoint = screenToModel(scale, offset, current);
  return pointAdd(currentPoint, pointSubtract(center, initialPoint));
};
