//
// Copyright 2021 DXOS.org
//

/**
 * https://www.npmjs.com/package/streamx
 * https://github.com/streamxorg/streamx
 * https://github.com/streamxorg/streamx/blob/master/index.js#L801
 */
declare module 'streamx' {
  import { EventEmitter } from 'events';

  type Callback <T> = (value: T) => void

  export class Stream extends EventEmitter {
    readonly readable: boolean;
    readonly writable: boolean;
    readonly destroyed: boolean;
    readonly destroying: boolean;

    destroy (err?: Error)

    on (event: string, cb: Callback)
    off (event: string, cb: Callback)
  }

  interface IReadable {
    pipe (dest: Writable, cb?: Callback)
    read (): any
    push ()
    unshift ()
    resume ()
    pause ()
  }

  interface IWritable {
    pipe (dest: Writable, cb?: Callback)
    read (): any
    push ()
    unshift ()
    resume ()
    pause ()
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L209
   */
  export class Readable extends Stream implements IReadable {
    constructor (any)

    pipe (dest: Writable, cb?: Callback)
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L104
   */
  export class Writable extends Stream implements IWritable {
    constructor (any)

    write: (data: any, next: () => void) => void;
    end ()
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L801
   */
  export class Duplex extends Readable implements Writable {
    constructor (any)

    pipe (dest: Writable, cb?: Callback)
    read (): any
    push ()
    unshift ()
    resume ()
    pause ()
    write (data: any, next: () => void): void
    end ()
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L839
   */
  export class Transform extends Duplex {
    constructor (any)

    _transform (data: Buffer, cb: (err: Error, mappedData: Buffer) => void): void
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L883
   */
  export class PassThrough extends Transform {
    constructor (any)
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L902
   */
  export class Pipeline {
    constructor (src: Stream, dst: Stream, cb: () => void)
  }

  function pipeline (stream: Stream, ...streams: Stream[], cb?: () => void): void

  export = pipeline;
}
