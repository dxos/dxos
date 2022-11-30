//
// Copyright 2020 DXOS.org
//

import { test } from '@dxos/test';

import { expectToThrow } from './throw';

test('expectToThrow', async () => {
  await expectToThrow(
    () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error());
        }, 100);
      })
  );
});
