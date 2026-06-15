//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

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

  test('clear resets buffer', () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    expect(buffer.elementCount).toBe(3);

    buffer.clear();
    expect(buffer.elementCount).toBe(0);
    expect([...buffer]).toStrictEqual([]);
    expect(buffer.getLast()).toBeUndefined();
  });

  test('clear allows reuse', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(10);
    buffer.push(20);
    buffer.clear();

    buffer.push(30);
    buffer.push(40);
    expect(buffer.elementCount).toBe(2);
    expect([...buffer]).toStrictEqual([30, 40]);
    expect(buffer.getLast()).toBe(40);
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
