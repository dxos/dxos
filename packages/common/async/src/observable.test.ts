//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { AsyncEvents, TimeoutError } from './errors';
import { latch } from './latch';
import { CancellableObservable, CancellableObservableEvents, CancellableObservableProvider } from './observable';

interface ConnectionEvents extends AsyncEvents, CancellableObservableEvents {
  onConnect(connectionId: string): void;
}

type ConnectionObservable = CancellableObservable<ConnectionEvents>;

describe.only('observable', function () {
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

      // TODO(burdon): Use asyncTimeoutObservable and/or delegation.

      const timeout = setTimeout(() => {
        clearTimeout(connectTimeout);
        observable.callbacks?.onTimeout(new TimeoutError(timeoutDelay));
      }, timeoutDelay);

      const connectTimeout = setTimeout(() => {
        clearTimeout(timeout);
        observable.callbacks?.onConnect('connection-1');
      }, connectionDelay);

      return observable;
    };

    let connected = false;
    let cancelled = false;
    let failed: Error | undefined;

    const observable = openConnection();

    // TODO(burdon): Auto unsubscribe on err?
    observable.subscribe({
      onConnect: () => {
        connected = true;
        setDone();
      },
      onCancel() {
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
      }
    });

    {
      const cancelTimeout = setTimeout(async () => {
        await observable.cancel();
      }, cancelDelay);

      await done();

      clearTimeout(cancelTimeout);
    }

    observable.unsubscribe();

    return { connected, cancelled, failed };
  };

  it('succeeds before cancelled', async function () {
    const { connected, cancelled, failed } = await runTest(20, 50, 100);
    expect(failed).to.be.undefined;
    expect(connected).to.be.true;
    expect(cancelled).to.be.false;
  });

  it('cancelled before succeeds', async function () {
    const { connected, cancelled, failed } = await runTest(50, 20, 100);
    expect(failed).to.be.undefined;
    expect(connected).to.be.false;
    expect(cancelled).to.be.true;
  });

  it('times out', async function () {
    const { connected, cancelled, failed } = await runTest(50, 30, 20);
    expect(failed).not.to.be.undefined;
    expect(connected).to.be.false;
    expect(cancelled).to.be.false;
  });
});
