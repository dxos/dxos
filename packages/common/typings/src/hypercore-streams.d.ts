//
// Copyright 2022 DXOS.org
//

/**
 * https://github.com/hypercore-protocol/hypercore-streams
 */
declare module 'hypercore-streams' {
  import { Hypercore } from 'hypercore';
  import { Readable, Writable } from 'streamx';

  export class WriteStream extends Writable {
    constructor(feed: Hypercore, opts: any);
  }

  export class ReadStream extends Readable {
    constructor(feed: Hypercore, opts: any = {});
  }
}
