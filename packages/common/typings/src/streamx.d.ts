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

  type Callback = (err: Error, value: any) => void;
  type EventCallback = (value: any) => void;

  export class Stream extends EventEmitter {
    readonly readable: boolean;
    readonly writable: boolean;
    readonly destroyed: boolean;
    readonly destroying: boolean;

    destroy(err?: Error);

    on(event: string, cb: EventCallback);
    off(event: string, cb: EventCallback);
  }

  interface IReadable {
    pipe(dest: Writable, cb?: Callback);
    read(): any;
    push();
    unshift();
    resume();
    pause();
  }

  interface IWritable {
    pipe(dest: Writable, cb?: Callback);
    read(): any;
    push();
    unshift();
    resume();
    pause();
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L209
   */
  export class Readable extends Stream implements IReadable {
    constructor(args?: any);

    pipe(dest: Writable, cb?: Callback);
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L104
   */
  export class Writable extends Stream implements IWritable {
    constructor(args?: any);

    write: (data: any) => void;
    end();
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L801
   */
  export class Duplex extends Readable implements Writable {
    constructor(args?: any);

    pipe(dest: Writable, cb?: Callback);
    read(): any;
    push();
    unshift();
    resume();
    pause();
    write: (data: any) => void;
    end();
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L839
   */
  export class Transform extends Duplex {
    constructor(args?: any);

    _transform(data: Buffer, cb?: Callback): void;
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L883
   */
  export class PassThrough extends Transform {
    constructor(args?: any);
  }

  /**
   * https://github.com/streamxorg/streamx/blob/master/index.js#L902
   */
  export class Pipeline {
    constructor(src: Stream, dst: Stream, cb?: Callback);
  }

  function pipeline(stream: Stream, ...streams: Stream[], cb?: Callback): void;

  export = pipeline;
}
