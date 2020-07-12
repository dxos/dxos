//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import from2 from 'from2';

import { dxos } from './proto/gen/bundle';

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
export class Streamer {
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

    // TODO(burdon): Flush all subscriptions on close.
  }

  subscribe (tag: string): IReadableStream {
    // TODO(burdon): Use model to manage order.
    const queue = [...this._index.get(tag) || []];
    log('Subscription', tag);

    let pending: Function | undefined;
    getOrSet(this._subscriptions, tag, Array).push((value: dxos.echo.testing.TestMessage) => {
      assert(value !== undefined);
      queue.push(value);

      if (pending) {
        pending();
      }
    });

    // TODO(burdon): Is this the right way to do streams?
    return from2.obj((size: number, next: Function) => {
      assert(!pending);
      if (queue.length) {
        log(`Streaming ${queue.length} messages`);
        next(null, queue.splice(0, size));
      } else {
        pending = () => {
          pending = undefined;
          log(`Streaming ${queue.length} messages`);
          next(null, queue.splice(0, size));
        };
      }
    });
  }
}
