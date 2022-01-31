//
// Copyright 2020 DXOS.org
//

import { Vector } from '../util';
import { Scale } from './scale';

test('toVertex', () => {
  const scale = new Scale(16);
  const v1 = Vector.toVertex({ x: 4, y: 8 });
  const p1 = scale.model.toPoint(v1);
  expect(p1).toEqual([4 * 16, -8 * 16]);
  const v2 = scale.screen.toVertex(p1);
  expect(v1).toEqual(v2);
});

test('toBounds', () => {
  const scale = new Scale(16);
  const b1 = Vector.toBounds({ x: 0, y: 0, width: 4, height: 4 });
  const b2 = scale.model.toBounds(b1);
  expect(b2).toEqual({ x: 0, y: -4 * 16, width: 4 * 16, height: 4 * 16 });
  const b3 = scale.screen.toBounds(b2);
  expect(b1).toEqual(b3);
});

test('snapValues', () => {
  const scale = new Scale(16);
  expect(scale.screen.snapValues([3, 9])).toEqual([0, 16]);
});
