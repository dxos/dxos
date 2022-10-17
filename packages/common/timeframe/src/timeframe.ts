//
// Copyright 2020 DXOS.org
//

import { inspect } from 'node:util';

import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

/**
 * A vector clock that implements ordering over a set of feed messages.
 */
export class Timeframe {
  private readonly _frames = new ComplexMap<PublicKey, number>(PublicKey.hash);

  constructor (frames: [PublicKey, number][] = []) {
    for (const [key, seq] of frames) {
      this.set(key, seq);
    }
  }

  // TODO(burdon): Rename getFrame.
  get (key: PublicKey) {
    return this._frames.get(key);
  }

  set (key: PublicKey, value: number) {
    this._frames.set(key, value);
  }

  // TODO(burdon): Change to getter.
  frames (): [PublicKey, number][] {
    return Array.from(this._frames.entries())
      .filter((frame): frame is [PublicKey, number] => !!frame);
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
  withoutKeys (keys: PublicKey[]): Timeframe {
    return new Timeframe(this.frames().filter(([frameKey]) => keys.every(key =>
      Buffer.compare(key.asBuffer(), frameKey.asBuffer()) !== 0)));
  }

  /**
   * Returns a total amount of messages represented by this timeframe.
   */
  totalMessages (): number {
    return Array.from(this._frames.values()).reduce((result, seq) => (result + seq + 1), 0);
  }

  toJSON () {
    return this.frames().reduce((frames: Record<string, number>, [key, seq]) => {
      frames[key.truncate()] = seq;
      return frames;
    }, {});
  }

  toString () {
    return `(${this.frames().map(([key, seq]) => `${key.truncate()} => ${seq}`).join(', ')})`;
  }

  /**
   * Used by NodeJS to get textual representation of this object in `console.log`.
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
