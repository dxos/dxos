//
// Copyright 2020 DXOS.org
//

import { expectToThrow } from './testing';

test('expectToThrow', async () => {
  await expectToThrow(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => { reject(new Error()); }, 100);
    });
  });
});
