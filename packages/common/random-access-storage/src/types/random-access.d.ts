//
// Copyright 2022 DXOS.org
//

declare module 'random-access-idb';
declare module 'random-access-memory';
declare module 'random-access-web/mutable-file-wrapper';

declare module 'random-access-file' {
  import type { RandomAccessFileConstructor } from './random-access-file';

  // Default constructor.
  const raf: RandomAccessFileConstructor;

  export = raf;
}
