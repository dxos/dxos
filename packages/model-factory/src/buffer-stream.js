//
// Copyright 2020 DXOS.org
//

import debounce from 'lodash.debounce';
import pLimit from 'p-limit';
import eos from 'end-of-stream';

/**
 * Debounce a handler where meanwhile it buffers incoming messages.
 * When the debounce finished it takes the list of messages
 * and execute an async handler that MUST be execute it in FIFO order
 * (we use p-limit to do that). Doing this we maintain the ordering
 * of the messages.
 *
 */
class Queue {
  constructor (stream, handler, period) {
    this._stream = stream;
    this._handler = handler;

    this._messages = [];
    this._limit = pLimit(1);
    this._debounced = debounce(() => this._queueHandler(), period);
    this._synced = false;
    stream.once('sync', () => {
      this._synced = true;
      this._process();
    });
    eos(stream, () => this._clear());
  }

  add (message) {
    this._messages.push(message);
    this._debounced();
  }

  _clear () {
    this._debounced.cancel();
    this._limit.clearQueue();
  }

  _queueHandler () {
    // fast return
    if (this._messages.length === 0 || this._stream.destroyed) {
      return this._clear();
    }

    if (this._synced) return this._process();
  }

  _process () {
    this._limit(() => {
      this._clear();

      if (this._messages.length === 0 || this._stream.destroyed) {
        return;
      }

      const batchMessages = [...this._messages];
      this._messages = [];

      return this._handler(batchMessages)
        .catch(err => {
          this._clear();
          process.nextTick(() => this._stream.destroy(err));
        });
    });
  }
}

/**
 * Returns a buffered message stream.
 *
 * @param {Function<Object[]>} handler
 * @param {Number} [period]
 * @return {Function}
 */
export const bufferedStreamHandler = (stream, handler, period = 0) => {
  if (!period) {
    return (message, cb) => {
      if (stream.destroyed) return cb();

      return handler([message])
        .then(() => cb())
        .catch(err => cb(err));
    };
  }

  const queue = new Queue(stream, handler, period);

  return (message, cb) => {
    queue.add(message);
    cb();
  };
};
