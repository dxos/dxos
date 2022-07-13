//
// Copyright 2020 DXOS.org
//

import { inspect } from 'util';

import { humanize } from '@dxos/crypto';
import { ComplexMap } from '@dxos/util';

import { FeedKey } from '../types';

/**
 * A mapping of feed key to a sequence number on that feed.
 * Describes how many messages have been processed.
 */
export class Timeframe {
  private readonly _frames = new ComplexMap<FeedKey, number>(key => key.asUint8Array().toString());

  constructor (frames: [FeedKey, number][] = []) {
    for (const [key, seq] of frames) {
      this._frames.set(key, seq);
    }
  }

  get (key: FeedKey) {
    return this._frames.get(key);
  }

  set (key: FeedKey, value: number) {
    this._frames.set(key, value);
  }

  // TODO(burdon): Change to getter.
  frames (): [FeedKey, number][] {
    return Array.from(this._frames.entries());
  }

  // TODO(burdon): Change to getter.
  size () {
    return this._frames.size;
  }

  // TODO(burdon): Change to getter (empty).
  isEmpty () {
    return this.size() === 0;
  }

  /**
   * Returns a new timeframe with specified keys removed.
   * @param keys
   */
  withoutKeys (keys: FeedKey[]): Timeframe {
    return new Timeframe(this.frames().filter(([frameKey]) => keys.every(key =>
      Buffer.compare(key.asBuffer(), frameKey.asBuffer()) !== 0)));
  }

  /**
   * Returns a total amount of messages represented by this timeframe.
   */
  totalMessages (): number {
    return Array.from(this._frames.values()).reduce((acc, seq) => acc + seq + 1, 0);
  }

  toJSON () {
    return this.frames().reduce((frames: Record<string, number>, [key, seq]) => {
      frames[humanize(key)] = seq;
      return frames;
    }, {});
  }

  toString () {
    return `(${this.frames().map(([key, seq]) => `${humanize(key)} => ${seq}`).join(', ')})`;
  }

  /**
   * Used by NodeJS to get textual representation of this object when it's printed with a `console.log` statement.
   */
  [inspect.custom] () {
    return `Timeframe${this.toString()}`;
  }

  /**
   * Merges the values, updating the highest sequence numbers.
   * @param timeframes
   */
  static merge (...timeframes: Timeframe[]): Timeframe {
    const result = new Timeframe();
    for (const timeframe of timeframes) {
      for (const [key, seq] of timeframe.frames()) {
        const current = result.get(key);
        if (current === undefined || seq > current) {
          result.set(key, seq);
        }
      }
    }

    return result;
  }

  /**
   * Compares two timeframes and returns an array of frames from the first timeframe where the sequence number
   * is greater than the associated sequence number from the second timeframe.
   *
   * @param tf1
   * @param tf2
   */
  static dependencies (
    tf1: Timeframe, tf2: Timeframe
  ): Timeframe {
    const result = new Timeframe();
    for (const [key, seq] of tf1.frames()) {
      const otherSeq = tf2.get(key);
      if (otherSeq === undefined || otherSeq < seq) {
        result.set(key, seq);
      }
    }

    return result;
  }
}
