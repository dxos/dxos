//
// Copyright 2020 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { expectToThrow } from '@dxos/debug';

import { Mutex, synchronized } from './mutex';
import { sleep } from './timeout';

describe('Mutex', () => {
  test('single execution', async () => {
    const events = [];
    const mutex = new Mutex();

    await mutex.executeSynchronized(async () => {
      events.push('mutex');
    });

    events.push('after');
    expect(events).to.deep.equal(['mutex', 'after']);
  });

  test('return value', async () => {
    const mutex = new Mutex();

    const value = await mutex.executeSynchronized(async () => 'foo');
    expect(value).to.equal('foo');
  });

  test('two concurrent synchronizations', async () => {
    const events = [];
    const mutex = new Mutex();

    const p1 = mutex
      .executeSynchronized(async () => {
        events.push('mutex1');
        await sleep(10);
        events.push('mutex2');
      })
      .then(() => {
        events.push('p1 resolve');
      });

    const p2 = mutex
      .executeSynchronized(async () => {
        events.push('mutex3');
      })
      .then(() => {
        events.push('p2 resolve');
      });

    await p1;
    await p2;
    events.push('after');

    expect(events).to.deep.equal(['mutex1', 'mutex2', 'p1 resolve', 'mutex3', 'p2 resolve', 'after']);
  });

  test('deadmutex', async () => {
    const mutex = new Mutex();

    const promise = mutex.executeSynchronized(async () => {
      await mutex.executeSynchronized(async () => {
        /* No-op. */
      });
    });

    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });

    await sleep(10);

    expect(resolved).to.be.false;
  });

  test('errors do not break the mutex', async () => {
    const mutex = new Mutex();

    let p1Status, p2Status;

    const p1 = mutex
      .executeSynchronized(async () => {
        throw new Error();
      })
      .then(
        () => {
          p1Status = 'resolved';
        },
        () => {
          p1Status = 'rejected';
        },
      );

    const p2 = mutex
      .executeSynchronized(async () => {
        /* No-op. */
      })
      .then(
        () => {
          p2Status = 'resolved';
        },
        () => {
          p2Status = 'rejected';
        },
      );

    await p1;
    await p2;

    expect(p1Status).to.equal('rejected');
    expect(p2Status).to.equal('resolved');
  });

  test('errors are propagated with stack traces', async () => {
    const mutex = new Mutex();

    const throwsError = async () => {
      throw new Error();
    };

    let error: Error;
    const callmutex = async () => {
      try {
        await mutex.executeSynchronized(async () => {
          await throwsError();
        });
      } catch (err: any) {
        error = err;
        throw error;
      }
    };

    await expectToThrow(() => callmutex());

    expect(error!.stack!.includes('throwsError')).to.be.true;
    expect(error!.stack!.includes('callmutex')).to.be.true;
  }); // .skipEnvironments('webkit');

  test('works with explicit resource management syntax', async () => {
    const mutex = new Mutex();

    const events: string[] = [];

    const p1 = (async () => {
      using _guard = await mutex.acquire();
      events.push('acquire one');
      await sleep(10);
      events.push('end one');
    })();

    const p2 = (async () => {
      using _guard = await mutex.acquire();
      events.push('acquire two');
      await sleep(10);
      events.push('end two');
    })();

    await Promise.all([p1, p2]);
    expect(events).to.deep.equal(['acquire one', 'end one', 'acquire two', 'end two']);
  });
});

class TestClass {
  constructor(private events: string[]) {}

  @synchronized
  async foo(): Promise<void> {
    this.events.push('foo start');
    await sleep(10);
    this.events.push('foo end');
  }

  @synchronized
  async bar(): Promise<void> {
    this.events.push('bar start');
    await sleep(30);
    this.events.push('bar end');
  }
}

describe('synchronized decorator', () => {
  test('different methods on same instance', async () => {
    const events: string[] = [];
    const testClass = new TestClass(events);

    const p1 = testClass.foo();
    const p2 = testClass.bar();

    await p1;
    await p2;

    expect(events).to.deep.equal(['foo start', 'foo end', 'bar start', 'bar end']);
  });

  test('methods on different instances', async () => {
    const events: string[] = [];
    const testClass1 = new TestClass(events);
    const testClass2 = new TestClass(events);

    const p1 = testClass1.foo();
    const p2 = testClass2.bar();

    await p1;
    await p2;

    expect(events).to.deep.equal(['foo start', 'bar start', 'foo end', 'bar end']);
  });
});
