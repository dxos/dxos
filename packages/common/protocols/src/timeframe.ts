//
// Copyright 2020 DXOS.org
//

import { inspect } from 'node:util';

import { PublicKey } from './public-key';

/**
 * A mapping of feed key to a sequence number on that feed.
 * Describes how many messages have been processed.
 */
export class Timeframe {
  // Cannot use ComplexMap because @dxos/util depends on @dxos/protocols for PublicKey.
  private readonly _keys = new Map<string, PublicKey>();
  private readonly _frames = new Map<string, number>();

  constructor (frames: [PublicKey, number][] = []) {
    for (const [key, seq] of frames) {
      this.set(key, seq);
    }
  }

  get (key: PublicKey) {
    const keyString = key.toString();
    return this._frames.get(keyString);
  }

  set (key: PublicKey, value: number) {
    const keyString = key.toString();
    this._frames.set(keyString, value);
    this._keys.set(keyString, key);
  }

  // TODO(burdon): Change to getter.
  frames (): [PublicKey, number][] {
    return Array.from(this._frames.entries())
      .map(([keyString, value]): [PublicKey, number] | undefined => {
        const key = this._keys.get(keyString);
        if (!key) {
          return undefined;
        }

        return [key, value];
      })
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
    return Array.from(this._frames.values()).reduce((acc, seq) => acc + seq + 1, 0);
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

export const timeframeSubstitutions = {
  'dxos.echo.timeframe.TimeframeVector': {
    encode: (timeframe: Timeframe) => ({
      frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq }))
    }),
    decode: (vector: any) => new Timeframe(
      (vector.frames ?? [])
        .filter((frame: any) => frame.feedKey != null && frame.seq != null)
        .map((frame: any) => [PublicKey.from(new Uint8Array(frame.feedKey)), frame.seq])
    )
  }
};
