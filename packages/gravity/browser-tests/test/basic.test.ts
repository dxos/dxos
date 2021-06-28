//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { Mocha } from 'mocha';

Mocha.it('2 + 2 = 4', () => {
  // eslint-disable-next-line jest/no-standalone-expect
  expect(2 + 2).toEqual(4);
});
