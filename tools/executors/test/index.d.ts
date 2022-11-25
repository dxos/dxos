//
// Copyright 2021 DXOS.org
//

declare global {
  const mochaExecutor: {
    environment: import('@dxos/test').TestEnvironment;
    tags: string[];
  };
}

export * from './dist/src/index';
