//
// Copyright 2022 DXOS.org
//

import { Point } from '@dxos/gem-core';

/**
 * Creates an array of points on the the circumference of two circles.
 * http://www.math.com/tables/geometry/circles.htm
 *
 * @param p1
 * @param p2
 * @param r1
 * @param r2
 * @return {[Point, Point]}
 */
export const getCircumferencePoints = (
  p1: Point, p2: Point, r1: number, r2: number
): [Point, Point] => {
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  const theta = Math.atan2(x2 - x1, y2 - y1);

  return [
    [
      x1 + (r1 === 0 ? 0 : r1 * Math.sin(theta)),
      y1 - (r1 === 0 ? 0 : r1 * -Math.cos(theta))
    ],
    [
      x2 + (r2 === 0 ? 0 : r2 * -Math.cos(Math.PI / 2 - theta)),
      y2 - (r2 === 0 ? 0 : r2 * Math.sin(Math.PI / 2 - theta))
    ]
  ];
};
