//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { keyToString } from '@dxos/crypto';

import { Timeframe } from '../proto';
import { FeedKey } from '../types';

// Required to access property by variable.
export interface IIndexable {
  [key: string]: any;
}

/**
 * Abstraction of the key field and type.
 * Assumes that the key type is mappable to a sortable scalar value.
 * This anticipates that the initial FeedKey based approach will be superceded by a compact
 * mapped indexed based approach (where each node can impute the feed admission order of each other).
 */
export abstract class KeyMapper<T, S> {
  private readonly _key: string;

  constructor (key: string) {
    this._key = key;
  }

  get key () {
    return this._key;
  }

  get (frame: Timeframe.Frame): T {
    return (frame as IIndexable)[this._key];
  }

  toArray (timeframe: Timeframe): [T, number][] {
    const { frames = [] } = timeframe;
    assert(frames);
    return frames.map(frame => [(frame as IIndexable)[this._key], frame.seq as number]);
  }

  fromArray (frames: [T, number][]): Timeframe {
    return {
      frames: frames.map(([key, seq]) => ({ [this._key]: key, seq }))
    };
  }

  abstract equals (key1: T, key2: T): boolean;
  abstract toScalar (value: T): S;
  abstract fromScalar (value: S): T;
}

export class FeedKeyMapper extends KeyMapper<FeedKey, string> {
  equals (key1: FeedKey, key2: FeedKey) {
    return Buffer.compare(key1, key2) === 0;
  }

  toScalar (value: FeedKey): string {
    return keyToString(value);
  }

  fromScalar (value: string): FeedKey {
    return Buffer.from(value);
  }
}

export class FeedIndexMapper extends KeyMapper<number, number> {
  equals (key1: number, key2: number) { return key1 === key2; }
  toScalar (value: number): number { return value; }
  fromScalar (value: number): number { return value; }
}

/**
 * Utility class to manipulate Timeframe protocol buffers.
 */
export class Spacetime<T, S> {
  private readonly _keyMapper: KeyMapper<T, S>;

  constructor (keyMapper: KeyMapper<T, S>) {
    this._keyMapper = keyMapper;
  }

  get keyMapper () {
    return this._keyMapper;
  }

  toJson (timeframe: Timeframe) {
    assert(timeframe);
    const { frames = [] } = timeframe;
    return frames?.map(frame => ({
      key: this._keyMapper.toScalar(this._keyMapper.get(frame)),
      seq: frame.seq
    }));
  }

  stringify (timeframe?: Timeframe | null | undefined) {
    return timeframe ? JSON.stringify(this.toJson(timeframe)) : null;
  }

  createTimeframe (frames?: [T, number][]): Timeframe {
    return {
      frames: (frames || []).map(([key, seq]) => ({ [this._keyMapper.key]: key, seq }))
    };
  }

  /**
   * Merges the values, updating the highest sequence numbers.
   * @param timeframes
   */
  merge (...timeframes: Timeframe[]): Timeframe {
    const map = new Map();
    const arrays = timeframes.map(timeframes => this._keyMapper.toArray(timeframes));
    arrays.reduce((a, b) => [...a, ...b], []).forEach(([key, seq]) => {
      assert(key);
      assert(seq !== undefined);
      const current = map.get(key);
      if (current === undefined || seq > current) {
        map.set(key, seq);
      }
    });

    return this._keyMapper.fromArray(Array.from(map));
  }

  /**
   * Removes the specified keys.
   * @param timeframe
   * @param keys
   */
  removeKeys (timeframe: Timeframe, keys: T[]): Timeframe {
    return {
      frames: this._keyMapper.toArray(timeframe)
        .filter(([key]) => keys.indexOf(key) === -1)
        .map(([key, seq]) => ({
          [this._keyMapper.key]: key,
          seq
        }))
    };
  }

  /**
   * Compares two timeframes and returns an array of frames from the first timeframe where the sequence number
   * is greater than the associated sequence number from the second timeframe.
   *
   * @param tf1
   * @param tf2
   */
  dependencies<T> (
    tf1: Timeframe, tf2: Timeframe
  ): Timeframe {
    return {
      frames: tf1.frames?.filter(frame => {
        assert(frame.seq !== undefined && frame.seq !== null);
        const key = this._keyMapper.get(frame);
        const { seq } = tf2.frames?.find(frame => this._keyMapper.equals(this._keyMapper.get(frame), key)) || {};

        // Return true to omit (i.e., dependency NOT met).
        return (seq === undefined || seq === null || seq < frame.seq);
      })
    };
  }
}
