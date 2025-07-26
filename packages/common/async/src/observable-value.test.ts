//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type AsyncEvents, TimeoutError } from './errors';
import {
  type CancellableObservable,
  type CancellableObservableEvents,
  CancellableObservableProvider,
} from './observable-value';
import { latch } from './trigger';

interface ConnectionEvents extends AsyncEvents, CancellableObservableEvents {
  onConnected(connectionId: string): void;
}

type ConnectionObservable = CancellableObservable<ConnectionEvents>;

describe('observable values', () => {
  /**
   * Sets up a race between:
   * a) succeeding
   * b) being cancelled
   * c) timing out
   */
  const runTest = async (connectionDelay: number, cancelDelay: number, timeoutDelay: number) => {
    const [done, setDone] = latch();

    const openConnection = (): ConnectionObservable => {
      const observable = new CancellableObservableProvider<ConnectionEvents>(async () => {
        clearTimeout(timeout);
        clearTimeout(connectTimeout);
      });

      const timeout = setTimeout(() => {
        clearTimeout(connectTimeout);
        observable.callback.onTimeout?.(new TimeoutError(timeoutDelay));
      }, timeoutDelay);

      const connectTimeout = setTimeout(() => {
        clearTimeout(timeout);
        observable.callback.onConnected('connection-1');
      }, connectionDelay);

      return observable;
    };

    let connected = false;
    let cancelled = false;
    let failed: Error | undefined;

    const observable = openConnection();

    const unsubscribe = observable.subscribe({
      onConnected: () => {
        connected = true;
        setDone();
      },
      onCancelled: () => {
        cancelled = true;
        setDone();
      },
      onTimeout: (err) => {
        failed = err;
        setDone();
      },
      onError: (err) => {
        failed = err;
        setDone();
      },
    });

    {
      const cancelTimeout = setTimeout(async () => {
        await observable.cancel();
      }, cancelDelay);

      await done();

      clearTimeout(cancelTimeout);
    }

    unsubscribe();

    return { connected, cancelled, failed };
  };

  test('succeeds before cancelled', async () => {
    const { connected, cancelled, failed } = await runTest(20, 50, 100);
    expect(failed).to.be.undefined;
    expect(connected).to.be.true;
    expect(cancelled).to.be.false;
  });

  test('cancelled before succeeds', async () => {
    const { connected, cancelled, failed } = await runTest(50, 20, 100);
    expect(failed).to.be.undefined;
    expect(connected).to.be.false;
    expect(cancelled).to.be.true;
  });

  test('times out', async () => {
    const { connected, cancelled, failed } = await runTest(50, 30, 20);
    expect(failed).to.exist;
    expect(connected).to.be.false;
    expect(cancelled).to.be.false;
  });
});
