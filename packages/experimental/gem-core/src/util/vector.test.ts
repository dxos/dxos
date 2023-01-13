//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { test } from '@dxos/test';

import { FractionUtil } from './fraction';
import { Vector } from './vector';

test('center', () => {
  expect(Vector.center(Vector.toBounds({ x: 0, y: 0, width: 2, height: 2 }))).to.deep.equal({
    x: FractionUtil.toFraction(1),
    y: FractionUtil.toFraction(1)
  });
});
