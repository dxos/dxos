//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { test, describe } from 'vitest';

import { arrayToBuffer, arrayToString, bufferToArray, stringToArray } from './uint8array';

describe('uint8array', () => {
  test('arrayToBuffer', () => {
    const data = new Uint8Array([1, 2, 3, 4]);

    const buffer = arrayToBuffer(data.subarray(1));
    expect(buffer.toString('hex')).to.eq('020304');

    // Buffer shares memory with Uint8Array.
    buffer[0] = 0;
    expect(data[1]).to.eq(0);
  });

  test('bufferToArray', () => {
    const data = Buffer.from([1, 2, 3, 4]);

    const array = bufferToArray(data.subarray(1));
    expect(array.toString()).to.eq('2,3,4');

    // Uint8Array shares memory with Buffer.
    array[0] = 0;
    expect(data[1]).to.eq(0);
  });

  test('arrayToString <> stringToArray', () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const encoded = arrayToString(data);
    const decoded = stringToArray(encoded);
    expect(decoded).to.deep.eq(data);
  });
});
