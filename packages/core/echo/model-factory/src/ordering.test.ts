//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { getInsertionIndex } from './ordering';
import { ModelMessage } from './types';

describe('Ordering', function () {
  // feedA < feedB
  const feedA = PublicKey.fromHex('0x0000000000000000000000000000000000000000000000000000000000000001');
  const feedB = PublicKey.fromHex('0x0000000000000000000000000000000000000000000000000000000000000002');

  it('mutations from a single feed get inserted at the end', function () {
    expect(
      getInsertionIndex(
        [createMutation(feedA, 0, new Timeframe()), createMutation(feedA, 1, new Timeframe())],
        createMutation(feedA, 2, new Timeframe())
      )
    ).toEqual(2);
  });

  it('mutations with higher feed key go after ones with lower feed key', function () {
    expect(
      getInsertionIndex([createMutation(feedA, 0, new Timeframe())], createMutation(feedB, 0, new Timeframe()))
    ).toEqual(1);
  });

  it('mutations with lower feed key go before ones with higher feed key', function () {
    expect(
      getInsertionIndex([createMutation(feedB, 0, new Timeframe())], createMutation(feedA, 0, new Timeframe()))
    ).toEqual(0);
  });

  it('dependant mutations with higher feed key get inserted at the end', function () {
    expect(
      getInsertionIndex(
        [createMutation(feedA, 0, new Timeframe())],
        createMutation(feedB, 0, new Timeframe([[feedA, 0]]))
      )
    ).toEqual(1);
  });

  it('dependant mutations with lower feed key get inserted at the end', function () {
    expect(
      getInsertionIndex(
        [createMutation(feedB, 0, new Timeframe())],
        createMutation(feedA, 0, new Timeframe([[feedB, 0]]))
      )
    ).toEqual(1);
  });

  it('same base', function () {
    expect(
      getInsertionIndex(
        [createMutation(feedB, 0, new Timeframe()), createMutation(feedB, 1, new Timeframe())],
        createMutation(feedA, 0, new Timeframe([[feedB, 0]]))
      )
    ).toEqual(1);
  });
});

const createMutation = (feedKey: PublicKey, seq: number, timeframe: Timeframe): ModelMessage<Uint8Array> => ({
  meta: {
    feedKey,
    memberKey: feedKey,
    seq,
    timeframe
  },
  mutation: new Uint8Array()
});
