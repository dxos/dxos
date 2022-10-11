//
// Copyright 2021 DXOS.org
//

import { EventEmitter } from 'events';

/**
 * Properties for `random-access-*` implementations.
 *
 * https://www.npmjs.com/package/random-access-storage
 * https://github.com/random-access-storage/random-access-storage
 */
export interface RandomAccessStorageProperties extends EventEmitter {
  readonly opened: boolean
  readonly suspended: boolean
  readonly closed: boolean
  readonly unlinked: boolean
  readonly writing: boolean

  readonly readable: boolean
  readonly writable: boolean
  readonly deletable: boolean
  readonly truncatable: boolean
  readonly statable: boolean
}
