//
// Copyright 2021 DXOS.org
//

/**
 * Hypercore Typescript Definitions version 9.12.0
 *
 * https://hypercore-protocol.org (Web)
 * https://www.npmjs.com/package/hypercore/v/9.12.0 (NPM)
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0 (Repo)
 * https://github.com/hypercore-protocol/hypercore/blob/v9.12.0/index.js#L53 (Code)
 *
 * Events
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#feedonready
 */
declare module 'hypercore' {
  import events = require('events');

  type Callback<T> = (err: Error | null, result?: T) => void

  export class Feed extends events.EventEmitter {
    opened: boolean;
    closed: boolean;
    discoveryKey: Buffer;
    head: any;
    key: Buffer;
    length: number;
    readable: boolean;
    secretKey: Buffer;

    // https://github.com/hypercore-protocol/hypercore/blob/v9.12.0/index.js#L53
    constructor(storage: RandomAccessFileConstructor, key: Buffer | string);

    open (cb?: Callback<void>): void
    close (cb?: Callback<void>): void
    ready (cb?: Callback<void>): void
  }

  export = Feed;
}
