//
// Copyright 2020 DXOS.org
//

import { Scale } from './scale';
import { Vector } from './vector';

test('conversion', () => {
  const scale = new Scale(16);
  const v1 = Vector.toVertex({ x: 4, y: 8 });
  const p1 = scale.model.toPoint(v1);
  expect(p1).toEqual([4 * 16, -8 * 16]);
  const v2 = scale.screen.toVertex(p1);
  expect(v1).toEqual(v2);
});

test('snap', () => {
  const scale = new Scale(16);
  expect(scale.screen.snapValues([3, 9])).toEqual([0, 16]);
});
