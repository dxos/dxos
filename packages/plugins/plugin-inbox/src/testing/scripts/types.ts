//
// Copyright 2025 DXOS.org
//

/* eslint-disable @typescript-eslint/consistent-type-imports */

// TODO(dmaretskyi): Move to @dxos/functions
declare module 'dxos:functions' {
  export const defineFunction: typeof import('@dxos/functions-sdk').defineFunction;

  export const S: typeof import('@dxos/functions-sdk').S;

  export const Filter: typeof import('@dxos/functions-sdk').Filter;

  export const FunctionsClient: typeof import('@dxos/functions-sdk').FunctionsClient;

  export const createClientFromEnv: typeof import('@dxos/functions-sdk').createClientFromEnv;
}
