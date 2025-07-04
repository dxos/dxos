//
// Copyright 2020 DXOS.org
//

import { inspect } from 'node:util';

import { equalsSymbol, type Equatable } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';

type Entry = {
  key: PublicKey;
  seq: number;
};

/**
 * A vector clock that implements ordering over a set of feed messages.
 */
export class Timeframe implements Equatable {
  private readonly _frames = new Map<string, Entry>();

  constructor(frames: [PublicKey, number][] = []) {
    for (const [key, seq] of frames) {
      this.set(key, seq);
    }
  }

  toJSON(): Record<string, number> {
    return this.frames().reduce((frames: Record<string, number>, [key, seq]) => {
      frames[key.truncate()] = seq;
      return frames;
    }, {});
  }

  toString(): string {
    return `(${this.frames()
      .map(([key, seq]) => `${key.truncate()}[${seq}]`)
      .join(', ')})`;
  }

  equals(object: Timeframe): boolean {
    return this.size() === object.size() && this.frames().every(([key, seq]) => object.get(key) === seq);
  }

  // TODO(burdon): Rename getFrame.
  get(key: PublicKey): number | undefined {
    return this._frames.get(key.toHex())?.seq;
  }

  // TODO(burdon): Rename setFrame.
  set(key: PublicKey, seq: number): void {
    const hex = key.toHex();
    this._frames.set(hex, { key, seq });
  }

  // TODO(burdon): Change to getter.
  frames(): [PublicKey, number][] {
    return Array.from(this._frames.values()).map(({ key, seq }) => [key, seq]);
  }

  // TODO(burdon): Change to getter.
  size(): number {
    return this._frames.size;
  }

  // TODO(burdon): Change to getter (empty).
  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Returns a new timeframe with specified keys removed.
   * @param keys
   */
  withoutKeys(keys: PublicKey[]): Timeframe {
    return new Timeframe(this.frames().filter(([frameKey]) => keys.every((key) => !key.equals(frameKey))));
  }

  map(fn: (frame: [key: PublicKey, seq: number]) => [PublicKey, number]): Timeframe {
    return new Timeframe(this.frames().map(fn));
  }

  /**
   * Returns a total amount of messages represented by this timeframe.
   */
  totalMessages(): number {
    return Array.from(this._frames.values()).reduce((result, { seq }) => result + seq + 1, 0);
  }

  /**
   * Returns a total amount of messages that are present in this timeframe but are missing in `base`.
   */
  newMessages(base: Timeframe): number {
    return Array.from(this._frames.entries()).reduce(
      (result, [hex, { seq }]) => result + Math.max(seq - (base._frames.get(hex)?.seq ?? -1), 0),
      0,
    );
  }

  /**
   * Used by NodeJS to get textual representation of this object in `console.log`.
   */
  [inspect.custom](): string {
    return `Timeframe${this.toString()}`;
  }

  [equalsSymbol](other: any): boolean {
    if (!(other instanceof Timeframe)) {
      return false;
    }

    return this.equals(other);
  }

  /**
   * Merges the values, updating the highest sequence numbers.
   * @param timeframes
   */
  static merge(...timeframes: Timeframe[]): Timeframe {
    const result = new Timeframe();
    for (const timeframe of timeframes) {
      for (const [hex, entry] of timeframe._frames) {
        const currentEntry = result._frames.get(hex);
        if (currentEntry === undefined || entry.seq > currentEntry.seq) {
          result._frames.set(hex, entry);
        }
      }
    }

    return result;
  }

  /**
   * Compares two timeframes and returns an array of frames from the first timeframe where the sequence number
   * is greater than the associated sequence number from the second timeframe.
   */
  static dependencies(tf1: Timeframe, tf2: Timeframe): Timeframe {
    const result = new Timeframe();
    for (const [hex, entry] of tf1._frames) {
      const otherEntry = tf2._frames.get(hex);
      if (otherEntry === undefined || otherEntry.seq < entry.seq) {
        result._frames.set(hex, entry);
      }
    }

    return result;
  }
}
