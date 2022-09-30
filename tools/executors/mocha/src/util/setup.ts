//
// Copyright 2022 DXOS.org
//

import { MochaExecutorOptions } from '../main';

export const runSetup = async (scripts: string[], options: MochaExecutorOptions) => {
  console.log('Running setup scripts.');
  const before = Date.now();

  for (const script of scripts) {
    const { setup } = await import(script);
    await setup?.(options);
  }

  console.log(`Setup script finished in ${Date.now() - before} ms.`);
};
