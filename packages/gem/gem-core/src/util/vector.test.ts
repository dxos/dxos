//
// Copyright 2020 DXOS.org
//

import { FractionUtil } from './fraction';
import { Vector } from './vector';

test('center', () => {
  expect(Vector.center(Vector.toBounds({ x: 0, y: 0, width: 2, height: 2 })))
    .toEqual({ x: FractionUtil.toFraction(1), y: FractionUtil.toFraction(1) });
});
