//
// Copyright 2020 DxOS.org
//

import debug from 'debug';

import { randomBytes } from '@dxos/crypto';

import { LogicalClockStamp, Order, BigIntToBuffer, BufferToBigInt } from './logical-clock-stamp';

const log = debug('dxos:echo:test');

describe('LogicalClockStamp', () => {
  // Partial order:
  test('zero', () => {
    const lcsZero = new LogicalClockStamp();
    const lcsNonZero = new LogicalClockStamp([[randomBytes(), 99999]]);

    const order = LogicalClockStamp.compare(lcsZero, lcsNonZero);
    log(`compare(zero, nonZero) -> ${Order[order]}`);
    expect(order).toBe(Order.BEFORE);
    const reverse = LogicalClockStamp.compare(lcsNonZero, lcsZero);
    log(`compare(nonZero, zero) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.AFTER);
  });

  test('ordered_one_node', () => {
    const nodeId = randomBytes();

    const lcsA = new LogicalClockStamp([[nodeId, 1]]);
    const lcsB = new LogicalClockStamp([[nodeId, 2]]);

    const order = LogicalClockStamp.compare(lcsA, lcsB);
    log(`compare(A:1, A:2) -> ${Order[order]}`);
    expect(order).toBe(Order.BEFORE);
    const reverse = LogicalClockStamp.compare(lcsB, lcsA);
    log(`compare(A:2, A:1) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.AFTER);
  });

  test('equal_one_nodes', () => {
    const nodeId = randomBytes();

    const lcsA = new LogicalClockStamp([[nodeId, 1]]);
    const lcsB = new LogicalClockStamp([[nodeId, 1]]);

    const order = LogicalClockStamp.compare(lcsA, lcsB);
    log(`compare(zero, nonZero) -> ${Order[order]}`);
    expect(order).toBe(Order.EQUAL);
    const reverse = LogicalClockStamp.compare(lcsB, lcsA);
    log(`compare(nonZero, zero) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.EQUAL);
  });

  test('ordered_two_nodes', () => {
    const nodeId1 = randomBytes();
    const nodeId2 = randomBytes();

    const lcsA = new LogicalClockStamp([
      [nodeId1, 1],
      [nodeId2, 2]
    ]);
    const lcsB = new LogicalClockStamp([
      [nodeId1, 2],
      [nodeId2, 2]
    ]);

    const order = LogicalClockStamp.compare(lcsA, lcsB);
    log(`compare(zero, nonZero) -> ${Order[order]}`);
    expect(order).toBe(Order.BEFORE);
    const reverse = LogicalClockStamp.compare(lcsB, lcsA);
    log(`compare(nonZero, zero) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.AFTER);
  });

  test('unordered_two_nodes', () => {
    const nodeId1 = randomBytes();
    const nodeId2 = randomBytes();

    const lcsA = new LogicalClockStamp([
      [nodeId1, 1],
      [nodeId2, 2]
    ]);
    const lcsB = new LogicalClockStamp([
      [nodeId1, 2],
      [nodeId2, 1]
    ]);

    const order = LogicalClockStamp.compare(lcsA, lcsB);
    log(`compare(zero, nonZero) -> ${Order[order]}`);
    expect(order).toBe(Order.CONCURRENT);
    const reverse = LogicalClockStamp.compare(lcsB, lcsA);
    log(`compare(nonZero, zero) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.CONCURRENT);
  });

  test('unrelated_two_nodes', () => {
    const lcsA = new LogicalClockStamp([
      [randomBytes(), 1]
    ]);

    const lcsB = new LogicalClockStamp([
      [randomBytes(), 1]
    ]);

    const order = LogicalClockStamp.compare(lcsA, lcsB);
    log(`compare(zero, nonZero) -> ${Order[order]}`);
    expect(order).toBe(Order.CONCURRENT);
    const reverse = LogicalClockStamp.compare(lcsB, lcsA);
    log(`compare(nonZero, zero) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.CONCURRENT);
  });

  test('equal_two_nodes', () => {
    const nodeId1 = randomBytes();
    const nodeId2 = randomBytes();

    const lcsA = new LogicalClockStamp([
      [nodeId1, 1],
      [nodeId2, 2]
    ]);

    const lcsB = new LogicalClockStamp([
      [nodeId1, 1],
      [nodeId2, 2]
    ]);

    const order = LogicalClockStamp.compare(lcsA, lcsB);
    log(`compare(zero, nonZero) -> ${Order[order]}`);
    expect(order).toBe(Order.EQUAL);
    const reverse = LogicalClockStamp.compare(lcsB, lcsA);
    log(`compare(nonZero, zero) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.EQUAL);
  });

  // Total order:

  test('unordered_two_nodes_total', () => {
    const nodeId1 = randomBytes();
    // Force nodeId2 to have a higher value then nodeId1
    const nodeId2 = BigIntToBuffer(BufferToBigInt(nodeId1) + BigInt(1));

    const lcsA = new LogicalClockStamp([
      [nodeId1, 1],
      [nodeId2, 2]
    ]);

    const lcsB = new LogicalClockStamp([
      [nodeId1, 2],
      [nodeId2, 1]
    ]);

    const order = LogicalClockStamp.totalCompare(lcsA, lcsB);
    log(`totalCompare(A:1 B:2, A:2 B:1) -> ${Order[order]}`);
    expect(order).toBe(Order.AFTER);
    const reverse = LogicalClockStamp.totalCompare(lcsB, lcsA);
    log(`totalCompare(A:2 B:1, A:1 B:2) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.BEFORE);
  });

  test('unrelated_two_nodes_total', () => {
    const nodeId1 = randomBytes();
    // Force nodeId2 to have a higher value then nodeId1
    const nodeId2 = BigIntToBuffer(BufferToBigInt(nodeId1) + BigInt(1));

    const lcsA = new LogicalClockStamp([
      [nodeId1, 1]
    ]);

    const lcsB = new LogicalClockStamp([
      [nodeId2, 1]
    ]);

    const order = LogicalClockStamp.totalCompare(lcsA, lcsB);
    log(`totalCompare(A:1, B:1) -> ${Order[order]}`);
    expect(order).toBe(Order.AFTER);
    const reverse = LogicalClockStamp.totalCompare(lcsB, lcsA);
    log(`totalCompare(B:1, A:1) -> ${Order[reverse]}`);
    expect(reverse).toBe(Order.BEFORE);
  });
});
