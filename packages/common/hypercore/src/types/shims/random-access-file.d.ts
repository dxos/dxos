//
// Copyright 2022 DXOS.org
//

declare module 'random-access-memory';

/**
 * https://www.npmjs.com/package/random-access-file
 */
declare module 'random-access-file' {
  import type { RandomAccessFileConstructor } from '@dxos/random-access-storage';

  // Default constructor.
  const raf: RandomAccessFileConstructor;

  export = raf;
}
