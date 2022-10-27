//
// Copyright 2021 DXOS.org
//

declare global {
  const mochaExecutor: {
    environment: import('@dxos/mocha').TestEnvironment;
  };
}

export * from './dist/src/index';
