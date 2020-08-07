//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { trigger } from '@dxos/async';

// TODO(burdon): Factor out to @dxos/async. (also remove useValue).
export const latch = (n: number) => {
  assert(n > 0);

  let callback: (value: number) => void;
  const promise = new Promise<number>((resolve) => {
    callback = value => resolve(value);
  });

  let count = 0;
  return [
    promise,
    () => {
      if (++count === n) {
        callback(count);
      }
    }
  ] as const;
};

/**
 * A simple syntax sugar to write `value as T` as a statement
 *
 * NOTE: This does not provide any type safety.
 * It's just for convinience so that autocomplete works for value.
 * It's recomended to check the type URL mannuly beforehand or use `assertAnyType` instead.
 * @param value
 */
// TODO(marik_d): Extract somewhere.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function assumeType<T> (value: unknown): asserts value is T {}

export function assertTypeUrl (value: any, typeUrl: string) {
  assert(value.__type_url === typeUrl, `Expected message with type URL \`${typeUrl}\` instead got \`${value.__type_url}\``);
}

/**
 * Checks the type of messages that come from `google.protobuf.Any` encoding.
 *
 * ## Usage example:
 * ```
 * assertAnyType<dxos.echo.testing.IItemEnvelope>(message, 'dxos.echo.testing.ItemEnvelope');
 * ```
 * @param value
 * @param typeUrl
 */
export function assertAnyType<T> (value: unknown, typeUrl: string): asserts value is T {
  assertTypeUrl(value, typeUrl);
}

// TODO(marik_d): Extract somewhere.
export class LazyMap<K, V> extends Map<K, V> {
  constructor (private _initFn: (key: K) => V) {
    super();
  }

  getOrInit (key: K): V {
    assert(key);

    if (this.has(key)) {
      return this.get(key)!;
    } else {
      const value = this._initFn(key);
      this.set(key, value);
      return value;
    }
  }
}

export class Trigger {
  _promise!: Promise<void>
  _wake!: () => void

  constructor () {
    this.reset();
  }

  wait () {
    return this._promise;
  }

  wake () {
    this._wake();
  }

  reset () {
    const [getPromise, wake] = trigger();
    this._promise = getPromise();
    this._wake = wake;
  }
}
