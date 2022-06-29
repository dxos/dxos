//
// Copyright 2020 DXOS.org
//

import { expectToThrow } from './throw';

test('expectToThrow', async () => {
  await expectToThrow(() => new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error());
    }, 100);
  }));
});
