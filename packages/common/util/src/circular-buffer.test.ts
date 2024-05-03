//
// Copyright 2024 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { CircularBuffer } from './circular-buffer';

describe('CircularBuffer', () => {
  test('single element', () => {
    const buffer = new CircularBuffer<number>(1);
    for (let i = 0; i < 3; i++) {
      buffer.push(i);
      expect([...buffer]).toStrictEqual([i]);
      expect(buffer.getLast()).toStrictEqual(i);
    }
  });

  test('full cycle', () => {
    const maxSize = 10;
    const regularArray: number[] = [];
    const buffer = new CircularBuffer<number>(maxSize);
    for (let i = 0; i < maxSize * 2 + 2; i++) {
      expect([...buffer]).toStrictEqual(regularArray);
      buffer.push(i);
      regularArray.push(i);
      if (regularArray.length > maxSize) {
        regularArray.splice(0, 1);
      }
      expect(buffer.getLast()).toStrictEqual(i);
    }
  });
});
