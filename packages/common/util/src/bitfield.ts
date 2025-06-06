//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

/**
 * Bitfield encodes indices from MSB to LSB.
 * Index 0 is the MSB of the first byte.
 *
 *
 * #0       #1       #2       #3
 * 01010101 11110000 00001111 01010101
 * ^      ^
 * MSB    LSB
 */
export class BitField {
  static get(data: Uint8Array, idx: number): boolean {
    const bit = (data[idx >> 3] >> (7 - (idx % 8))) & 0x1;
    return !!bit;
  }

  static set(data: Uint8Array, idx: number, value: boolean): void {
    if (value) {
      data[idx >> 3] = data[idx >> 3] | (1 << (7 - (idx % 8)));
    } else {
      data[idx >> 3] = data[idx >> 3] & ~(1 << (7 - (idx % 8)));
    }
  }

  /**
   * [start; end)
   */
  static count(data: Uint8Array, begin: number, end: number): number {
    let count = 0;
    for (let i = begin; i < end; i++) {
      const bit = (data[i >> 3] >> (7 - (i % 8))) & 0x1;
      count += bit;
    }
    return count;
  }

  static invert(data: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = ~data[i];
    }
    return result;
  }

  static and(first: Uint8Array, second: Uint8Array): Uint8Array {
    invariant(first.length === second.length, 'Bitfields must be of the same length');
    const result = new Uint8Array(first.length);
    for (let i = 0; i < first.length; i++) {
      result[i] = first[i] & second[i];
    }
    return result;
  }

  static findIndexes(data: Uint8Array, opts: { start?: number; end?: number; value?: boolean } = {}): number[] {
    const { start = 0, end = data.length * 8, value = true } = opts;

    const result = [];

    for (let i = start; i < end; i++) {
      if (BitField.get(data, i) === value) {
        result.push(i);
      }
    }
    return result;
  }

  static ones(count: number): Uint8Array {
    const res = new Uint8Array(Math.ceil(Math.ceil(count) / 8)).fill(0xff);

    // Note: We need to calculate last byte of bitfield.
    const bitInLastByte = Math.ceil(count % 8);
    res[res.length - 1] = 0xff << (8 - bitInLastByte);

    return res;
  }

  static zeros(count: number): Uint8Array {
    return new Uint8Array(Math.ceil(Math.ceil(count) / 8)).fill(0);
  }
}
