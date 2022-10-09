//
// Copyright 2021 DXOS.org
//

/**
 * Interface of file objects returned by `random-access-*` implementations.
 *
 * https://www.npmjs.com/package/random-access-storage
 * https://github.com/random-access-storage/random-access-storage
 */
declare module 'random-access-storage' {
  import events from 'events';

  export class RandomAccessStorage extends events.EventEmitter {
    opened: boolean;
    closed: boolean;

    // TODO(burdon): Which platforms support this? Not documented.
    destroyed?: boolean;
  }

  export = RandomAccessStorage;
}
