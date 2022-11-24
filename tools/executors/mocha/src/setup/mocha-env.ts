//
// Copyright 2022 DXOS.org
//

(globalThis as any).mochaExecutor = {
  environment: 'nodejs',
  tags: (process.env.MOCHA_TAGS ?? '').split(',')
};
