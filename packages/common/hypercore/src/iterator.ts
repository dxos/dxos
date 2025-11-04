//
// Copyright 2022 DXOS.org
//

import { Readable } from 'readable-stream';
import { type Readable as StreamXReadable } from 'streamx';

/**
 * Wraps streamx.Readable (hypercore.createReadStream) to a standard Readable stream.
 *
 * The read-stream package is mirror of the streams implementations in Node.js 18.9.0.
 * This function is here to standardize the cast in case there are incompatibilities
 * across different platforms.
 *
 * Hypercore createReadStream returns a `streamx` Readable, which does not close properly on destroy.
 *
 * https://github.com/nodejs/readable-stream
 * https://nodejs.org/api/stream.html#readable-streams
 * https://nodejs.org/dist/v18.9.0/docs/api/stream.html#readablewrapstream
 */
export const createReadable = (stream: StreamXReadable): Readable =>
  new Readable({ objectMode: true }).wrap(stream as any);

/**
 * Converts streamx.Readable (hypercore.createReadStream) to an async iterator.
 *
 * https://github.com/tc39/proposal-async-iteration
 * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#async-iteration
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
 */
export const createAsyncIterator = (stream: Readable): AsyncIterator<any> => stream[Symbol.asyncIterator]();
