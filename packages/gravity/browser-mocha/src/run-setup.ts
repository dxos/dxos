//
// Copyright 2021 DXOS.org
//

import { resolve } from 'path';

export const runSetup = async (setupFilePath: string) => {
  console.log('Running setup script.');
  const before = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const setupFn = require(resolve(setupFilePath));
  await setupFn();

  console.log(`Setup script finished in ${Date.now() - before} ms.`);
};
