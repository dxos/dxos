//
// Copyright 2022 DXOS.org
//

(globalThis as any).mochaExecutor = {
  environment: process.env.MOCHA_ENV ?? 'nodejs',
  tags: (process.env.MOCHA_TAGS ?? '').split(','),
  executorResult: JSON.parse(process.env.EXECUTOR_RESULT ?? '{}')
};
