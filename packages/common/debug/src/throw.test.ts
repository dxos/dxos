//
// Copyright 2020 DXOS.org
//

import { expectToThrow } from './throw';

it('expectToThrow', async function () {
  await expectToThrow(() => new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error());
    }, 100);
  }));
});
