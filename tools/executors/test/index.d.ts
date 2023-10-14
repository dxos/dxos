//
// Copyright 2021 DXOS.org
//

declare global {
  const mochaExecutor: {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    environment: import('@dxos/test').TestEnvironment;
    tags: string[];
    executorResult: Record<string, any>;
  };
}

export * from './dist/src/index';
