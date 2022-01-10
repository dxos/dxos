//
// Copyright 2020 DXOS.org
//

import { ViewBounds, Point, createBounds, contains } from './screen';

test('Bounds', () => {
  const tests: { p1: Point, p2: Point, bounds: ViewBounds }[] = [
    {
      p1: [0, 0],
      p2: [0, 0],
      bounds: { x: 0, y: 0, width: 0, height: 0 }
    },
    {
      p1: [0, 0],
      p2: [5, 5],
      bounds: { x: 0, y: 0, width: 5, height: 5 }
    },
    {
      p1: [0, 0],
      p2: [-5, -5],
      bounds: { x: -5, y: -5, width: 5, height: 5 }
    }
  ];

  tests.forEach(({ p1, p2, bounds }) => {
    expect(createBounds(p1, p2)).toEqual(bounds);
  });
});

test('Contains', () => {
  const bounds = createBounds([0, 0], [5, 5]);

  expect(contains(bounds, [0, 0])).toBeTruthy();
  expect(contains(bounds, [2, 1])).toBeTruthy();
  expect(contains(bounds, [5, 5])).toBeTruthy();
  expect(contains(bounds, [0, 6])).toBeFalsy();
});
