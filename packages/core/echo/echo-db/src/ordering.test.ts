//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';

import { getInsertionIndex, type MutationInQueue, MutationQueue } from './ordering';

describe('Ordering', () => {
  // feedA < feedB
  const feedA = PublicKey.fromHex('0x0000000000000000000000000000000000000000000000000000000000000001');
  const feedB = PublicKey.fromHex('0x0000000000000000000000000000000000000000000000000000000000000002');

  test('mutations from a single feed get inserted at the end', () => {
    expect(
      getInsertionIndex(
        [createMutation(feedA, 0, new Timeframe()), createMutation(feedA, 1, new Timeframe())],
        createMutation(feedA, 2, new Timeframe()),
      ),
    ).toEqual(2);
  });

  test('mutations with higher feed key go after ones with lower feed key', () => {
    expect(
      getInsertionIndex([createMutation(feedA, 0, new Timeframe())], createMutation(feedB, 0, new Timeframe())),
    ).toEqual(1);
  });

  test('mutations with lower feed key go before ones with higher feed key', () => {
    expect(
      getInsertionIndex([createMutation(feedB, 0, new Timeframe())], createMutation(feedA, 0, new Timeframe())),
    ).toEqual(0);
  });

  test('dependant mutations with higher feed key get inserted at the end', () => {
    expect(
      getInsertionIndex(
        [createMutation(feedA, 0, new Timeframe())],
        createMutation(feedB, 0, new Timeframe([[feedA, 0]])),
      ),
    ).toEqual(1);
  });

  test('dependant mutations with lower feed key get inserted at the end', () => {
    expect(
      getInsertionIndex(
        [createMutation(feedB, 0, new Timeframe())],
        createMutation(feedA, 0, new Timeframe([[feedB, 0]])),
      ),
    ).toEqual(1);
  });

  test('same base', () => {
    expect(
      getInsertionIndex(
        [createMutation(feedB, 0, new Timeframe()), createMutation(feedB, 1, new Timeframe())],
        createMutation(feedA, 0, new Timeframe([[feedB, 0]])),
      ),
    ).toEqual(1);
  });

  describe('MutationQueue', () => {
    test('new mutations get applied', () => {
      const queue = new MutationQueue();

      expect(queue.pushConfirmed(createMutation(feedA, 0, new Timeframe()))).toEqual({ reorder: false, apply: true });
      expect(queue.pushConfirmed(createMutation(feedA, 1, new Timeframe()))).toEqual({ reorder: false, apply: true });
      expect(queue.pushConfirmed(createMutation(feedB, 0, new Timeframe(), ['unk']))).toEqual({
        reorder: false,
        apply: true,
      });
      expect(queue.pushConfirmed(createMutation(feedA, 2, new Timeframe()))).toEqual({ reorder: true, apply: true });

      expect(queue.getMutations().length).toEqual(4);
    });

    test('confirming optimistic mutations', () => {
      const queue = new MutationQueue();

      queue.pushOptimistic(createOptimisticMutation(['1']));
      expect(queue.pushConfirmed(createMutation(feedA, 0, new Timeframe(), ['1']))).toEqual({
        reorder: false,
        apply: false,
      });

      queue.pushOptimistic(createOptimisticMutation(['2']));
      expect(queue.pushConfirmed(createMutation(feedA, 1, new Timeframe(), ['2']))).toEqual({
        reorder: false,
        apply: false,
      });

      expect(queue.getMutations().length).toEqual(2);
    });

    test('push confirmed under optimistic', () => {
      const queue = new MutationQueue();

      queue.pushOptimistic(createOptimisticMutation(['1']));
      expect(queue.pushConfirmed(createMutation(feedA, 0, new Timeframe()))).toEqual({ reorder: true, apply: true });
      expect(queue.pushConfirmed(createMutation(feedB, 0, new Timeframe(), ['1']))).toEqual({
        reorder: false,
        apply: false,
      });

      expect(queue.getMutations().length).toEqual(2);
    });

    test('pushing mutation with same tag throws', async () => {
      const queue = new MutationQueue();

      queue.pushOptimistic(createOptimisticMutation(['1', '2', '3', '4']));
      expect(() => queue.pushOptimistic(createOptimisticMutation(['5', '6', '2', '7']))).toThrowError('2');
    });

    test('confirming mutation with more than one tag throws', async () => {
      const queue = new MutationQueue();

      queue.pushOptimistic(createOptimisticMutation(['1', '2', '3', '4']));
      expect(() => queue.pushConfirmed(createMutation(feedA, 0, new Timeframe(), ['1', '2']))).toThrow();
    });

    test('mutation is confirmed if at one tag matches', async () => {
      const queue = new MutationQueue();

      const mutation = createOptimisticMutation(['1', '2', '3', '4']);
      queue.pushOptimistic(mutation);
      expect(queue.getConfirmedMutations().length).toEqual(0);
      queue.pushConfirmed(createMutation(feedA, 0, new Timeframe(), ['2']));
      expect(queue.getConfirmedMutations().length).toEqual(1);
    });
  });
});

const createMutation = (
  feedKey: PublicKey,
  seq: number,
  timeframe: Timeframe,
  clientTag?: string[],
): MutationInQueue => ({
  mutation: {
    meta: {
      feedKey,
      memberKey: feedKey,
      seq,
      timeframe,
      clientTag,
    },
    model: {
      type_url: 'test',
      value: new Uint8Array(),
    },
  },
});

const createOptimisticMutation = (clientTag: string[]): MutationInQueue => ({
  mutation: {
    meta: {
      clientTag,
    },
    model: {
      type_url: 'test',
      value: new Uint8Array(),
    },
  },
});
