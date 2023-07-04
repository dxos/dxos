//
// Copyright 2023 DXOS.org
//

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
    const bit = (data[idx >> 3] >> (7 - idx % 8)) & 0x1;
    return !!bit;
  }

  static set(data: Uint8Array, idx: number, value: boolean) {
    if (value) {
      data[idx >> 3] = data[idx >> 3] | (1 << (7 - idx % 8));
    } else {
      data[idx >> 3] = data[idx >> 3] & ~(1 << (7 - idx % 8));
    }
  }

  /**
   * [start; end)
   */
  static count(data: Uint8Array, begin: number, end: number) {
    let count = 0;
    for (let i = begin; i < end; i++) {
      const bit = (data[i >> 3] >> (7 - i % 8)) & 0x1;
      count += bit;
    }
    return count;
  }
}