//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Convert to actual definitions.

/**
 * https://www.npmjs.com/package/streamx
 * https://github.com/streamxorg/streamx
 */
declare module 'streamx' {
  import EventEmitter from 'events';

  type Callback = () => void

  export interface Stream extends EventEmitter {
    readonly readable: boolean
    readonly writable: boolean
    readonly destroyed: boolean
    readonly destroying: boolean

    destroy (err?: Error)

    on (event: string, cb: Callback)
    off (event: string, cb: Callback)
  }

  export interface Readable extends Stream {
    end ()
    pipe (dest?: Writable, cb?: Callback)
    pause ()
    resume ()
  }

  export interface Writable extends Stream {
    end ()
  }

  export interface Duplex extends Readable, Writable {}

  export interface Transform extends Duplex {
    _transform (data: Buffer, cb: (err: Error, mappedData: Buffer) => void): void
  }

  // Last arg can be optional callback.
  export type Pipeline = (...streams: (Stream | (() => void))[]) => Stream;

  export const pipeline: Pipeline;
}
