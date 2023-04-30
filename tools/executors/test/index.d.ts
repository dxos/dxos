//
// Copyright 2021 DXOS.org
//

declare global {
  const mochaExecutor: {
    environment: import('@dxos/test').TestEnvironment;
    tags: string[];
    executorResult: { [key: string]: any };
  };
}

export * from './dist/src/index';
