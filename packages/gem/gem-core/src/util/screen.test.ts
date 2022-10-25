//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { ScreenBounds, Point, Screen } from './screen';

test('createBounds', function () {
  const tests: { p1: Point; p2: Point; bounds: ScreenBounds }[] = [
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
    expect(Screen.createBounds(p1, p2)).to.deep.equal(bounds);
  });
});

test('contains', function () {
  const bounds = Screen.createBounds([0, 0], [5, 5]);

  expect(Screen.contains(bounds, [0, 0])).to.be.true;
  expect(Screen.contains(bounds, [2, 1])).to.be.true;
  expect(Screen.contains(bounds, [5, 5])).to.be.true;
  expect(Screen.contains(bounds, [0, 6])).to.be.false;
});
