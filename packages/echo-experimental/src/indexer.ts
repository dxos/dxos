//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import from2 from 'from2';

import { dxos } from './proto/gen/testing';

const log = debug('dxos:echo:streamer');
debug.enable('dxos:echo:*');

// TODO(burdon): Factor out?
interface IBlock {
  data: dxos.echo.testing.Envelope
}

interface IReadableStream {
  on (event: string, callback: object): void;
}

const getOrSet = (map: Map<string, any>, key: string, constructor: Function) => {
  let value = map.get(key);
  if (value === undefined) {
    value = constructor();
    map.set(key, value);
  }

  return value;
};

/**
 * Consumes a message queue and provides streamable queries.
 */
export class Indexer {
  // Map of arrays by tag.
  _index = new Map();

  // Map of subscriptions by tag.
  _subscriptions = new Map();

  constructor (stream: IReadableStream) {
    stream.on('data', (block: IBlock) => {
      const { data: { message } } = block;
      const { tag } = (message as dxos.echo.testing.TestMessage);
      const values = getOrSet(this._index, tag, Array);
      values.push(message);

      (this._subscriptions.get(tag) || []).forEach((callback: Function) => callback(message));
    });

    const cleanup = () => {
      this._subscriptions.forEach(
        subscriptions => subscriptions.forEach((callback: Function) => callback()));
    };

    // TODO(burdon): Both are called -- is this necessary?
    stream.on('close', cleanup);
    stream.on('end', cleanup);
  }

  /**
   * Create a subscription for messages with the given tag.
   * @param {string} tag
   * @return {IReadableStream}
   */
  subscribe (tag: string): IReadableStream {
    // TODO(burdon): Use model to manage order.
    const queue = [...this._index.get(tag) || []];

    log(`Created subscription[${tag}]: ${queue.length} initial message(s).`);

    // Create stream.
    let pending: Function | undefined;
    const stream = from2.obj((size: number, next: Function) => {
      assert(!pending);
      if (queue.length) {
        // log(`Streaming ${queue.length} messages`);
        next(null, queue.splice(0, size));
      } else {
        pending = () => {
          pending = undefined;
          // log(`Streaming ${queue.length} messages`);
          next(null, queue.splice(0, size));
        };
      }
    });

    // Register subscription.
    getOrSet(this._subscriptions, tag, Array).push((value: dxos.echo.testing.TestMessage) => {
      if (value !== undefined) {
        queue.push(value);
      }

      // Update stream.
      if (pending) {
        pending();
      }

      if (value === undefined) {
        stream.destroy();
      }
    });

    return stream;
  }
}
