//
// Copyright 2022 DXOS.org
//

export const logger =
  (verbose: boolean) =>
  (...args: any[]) =>
    verbose ? console.log(...args) : undefined;
