//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Convert to actual definitions.

/**
 * https://www.npmjs.com/package/streamx
 * https://github.com/streamxorg/streamx
 */
declare module 'streamx' {
  import type { EventEmitter } from 'events';

  type Callback <T> = (value: T) => void

  export class Stream extends EventEmitter {
    readonly readable: boolean
    readonly writable: boolean
    readonly destroyed: boolean
    readonly destroying: boolean

    destroy (err?: Error)

    on (event: string, cb: Callback)
    off (event: string, cb: Callback)
  }

  export class Readable extends Stream {
    end ()
    pause ()
    resume ()
    pipe (dest: Writable, cb?: Callback)
  }

  export class Writable extends Stream {
    end ()
  }

  export class Duplex extends Readable, Writable {}

  export class Transform extends Duplex {
    _transform (data: Buffer, cb: (err: Error, mappedData: Buffer) => void): void
  }

  export class Pipeline {
    constructor (src: Stream, dst: Stream, cb: () => void)
  }

  function pipeline (stream: Stream, ...streams: Stream[], cb?: () => void): void

  export = pipeline;
}
