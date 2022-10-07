//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { Readable, Transform, Writable } from 'readable-stream';

import type { HypercoreFeed } from './hypercore';

const error = debug('dxos:stream:error');

/**
 * Stream utils, `https://nodejs.org/api/stream.html`.
 * NOTE: Turn on 'dxox:*:error' to see errors within callbacks that cause the following error:
 * Error [ERR_MULTIPLE_CALLBACK]: Callback called multiple times.
 */

/**
 * Returns a stream that appends messages directly to a hypercore feed.
 * @returns {NodeJS.WritableStream}
 */
// TODO(burdon): Move to @dxos/codec.
export const createWritableFeedStream = (feed: HypercoreFeed) => new Writable({
  objectMode: true,
  write: (message, _, callback) => {
    feed.append(message, callback);
  }
});

/**
 * Creates a readStream stream that can be used as a buffer into which messages can be pushed.
 */
export const createReadable = (): Readable => new Readable({
  objectMode: true,
  read: () => {}
});

/**
 * Creates a writeStream object stream.
 * @param callback
 */
export const createWritable = <T>(callback: (message: T) => Promise<void>): NodeJS.WritableStream => new Writable({
  objectMode: true,
  write: async (message: T, _, next) => {
    try {
      await callback(message);
      next();
    } catch (err: any) {
      error(err);
      next(err);
    }
  }
});

/**
 * Creates a transform object stream.
 * @param callback
 */
export const createTransform = <R, W>(callback: (message: R) => Promise<W | undefined>): Transform => new Transform({
  objectMode: true,
  transform: async (message: R, _, next) => {
    try {
      const response = await callback(message);
      next(undefined, response);
    } catch (err: any) {
      error(err);
      next(err);
    }
  }
});

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
