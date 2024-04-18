//
// Copyright 2023 DXOS.org
//
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { describe, test } from 'vitest'

import { ConnectionLimiter } from './connection-limiter';

chai.use(chaiAsPromised);

describe('ConnectionLimiter', () => {
  function* setupPeers(
    limiter: ConnectionLimiter,
  ): Generator<{ sessionId: PublicKey; connecting: () => Promise<void>; doneConnecting: () => void }> {
    while (true) {
      const sessionId = PublicKey.random();
      yield {
        sessionId,
        connecting: () => asyncTimeout(limiter.connecting(sessionId), 500),
        doneConnecting: () => limiter.doneConnecting(sessionId),
      };
    }
  }

  test('resolves immediately when limit is not reached', async () => {
    const limiter = new ConnectionLimiter({ maxConcurrentInitConnections: 2 });
    const [first, second, third] = setupPeers(limiter);
    await Promise.all([first.connecting(), second.connecting()]);
    first.doneConnecting();
    await third.connecting();
  });

  test('rejects if done is called', async () => {
    const limiter = new ConnectionLimiter({ maxConcurrentInitConnections: 1 });
    const [first] = setupPeers(limiter);
    const testPromise = expect(first.connecting()).to.be.rejected;
    first.doneConnecting();
    await testPromise;
  });
});
