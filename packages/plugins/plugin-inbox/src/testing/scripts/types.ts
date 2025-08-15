//
// Copyright 2025 DXOS.org
//

/* eslint-disable @typescript-eslint/consistent-type-imports */

// TODO(dmaretskyi): Move to @dxos/functions
declare module 'dxos:functions' {
  export const ObjectId: any; // typeof import('@dxos/functions-sdk').ObjectId;

  export const create: any; // typeof import('@dxos/functions-sdk').create;

  export const defineFunction: any; // typeof import('@dxos/functions-sdk').defineFunction;

  export const S: any; // typeof import('@dxos/functions-sdk').S;

  export const Filter: any; // typeof import('@dxos/functions-sdk').Filter;

  export const FunctionsClient: any; // typeof import('@dxos/functions-sdk').FunctionsClient;

  export const createClientFromEnv: any; //  typeof import('@dxos/functions-sdk').createClientFromEnv;
}
