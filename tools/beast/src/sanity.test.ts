//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import madge from 'madge';
import { it as test } from 'mocha';
import path from 'path';

const baseDir = path.join(__dirname, '../../../packages/sdk/client');
// const baseDir = path.join(__dirname, './');

test.skip('sanity', async () => {
  const res = await madge(path.join(baseDir, './src/index.ts'), {
    // baseDir,
    tsConfig: path.join(__dirname, './tsconfig.json'),
    fileExtensions: ['ts']
  });

  // console.log(res.circular());
  console.log(res);

  expect(true).toBeTruthy();
});
