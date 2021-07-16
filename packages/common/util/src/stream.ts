//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { Feed } from 'hypercore';
import { PassThrough, Readable, Transform, Writable } from 'stream';

import { any } from '@dxos/codec-protobuf';

const log = debug('dxos:stream');
const error = debug('dxos:stream:error');

//
// Stream utils.
// https://nodejs.org/api/stream.html
// NOTE: Turn on 'dxox:*:error' to see errors within callbacks that cause the following error:
// Error [ERR_MULTIPLE_CALLBACK]: Callback called multiple times
//

/**
 * NOTE: The parameterized type `T` should be the generated interface, whereas the `typeUrl` should be the classnae.
 * @param data
 * @param typeUrl
 */
// TODO(burdon): Move to @dxos/codec.
// TODO(burdon): The parent should call this (not the message creator).
// TODO(burdon): Create version with short into code (for system types); Make compatable with google any.
export function createAny<T> (data: T, typeUrl: string) {
  return any(typeUrl, data);
}

/**
 * Returns a stream that appends messages directly to a hypercore feed.
 * @param feed
 * @returns {NodeJS.WritableStream}
 */
// TODO(burdon): Move to @dxos/codec.
export function createWritableFeedStream (feed: Feed) {
  return new Writable({
    objectMode: true,
    write (message, _, callback) {
      feed.append(message, callback);
    }
  });
}

/**
 * Creates a readStream stream that can be used as a buffer into which messages can be pushed.
 */
export function createReadable<T> (): Readable {
  return new Readable({
    objectMode: true,
    read () {}
  });
}

/**
 * Creates a writeStream object stream.
 * @param callback
 */
export function createWritable<T> (callback: (message: T) => Promise<void>): NodeJS.WritableStream {
  return new Writable({
    objectMode: true,
    write: async (message: T, _, next) => {
      try {
        await callback(message);
        next();
      } catch (err) {
        error(err);
        next(err);
      }
    }
  });
}

/**
 * Creates a no-op transform.
 */
export function createPassThrough<T> (): PassThrough {
  return new PassThrough({
    objectMode: true,
    transform: async (message: T, _, next) => {
      next(null, message);
    }
  });
}

/**
 * Creates a transform object stream.
 * @param callback
 */
export function createTransform<R, W> (callback: (message: R) => Promise<W | undefined>): Transform {
  return new Transform({
    objectMode: true,
    transform: async (message: R, _, next) => {
      try {
        const response = await callback(message);
        next(null, response);
      } catch (err) {
        error(err);
        next(err);
      }
    }
  });
}

/**
 * Injectable logger.
 * @param logger
 */
export function createLoggingTransform (logger: Function = log): Transform {
  return createTransform<any, any>(message => {
    logger(message);
    return message;
  });
}

/**
 * Wriable stream that collects objects (e.g., for testing).
 */
export class WritableArray<T> extends Writable {
  _objects: T[] = [];

  constructor () {
    super({ objectMode: true });
  }

  clear () {
    this._objects = [];
  }

  get objects () {
    return this._objects;
  }

  override _write (object: any, _: BufferEncoding, next: (error?: Error | null) => void): void {
    this._objects.push(object);
    next();
  }
}
