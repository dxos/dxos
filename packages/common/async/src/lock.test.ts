//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { expectToThrow } from '@dxos/debug';
import { describe, test } from '@dxos/test';

import { Lock, synchronized } from './lock';
import { sleep } from './timeout';

describe('Lock', () => {
  test('single execution', async () => {
    const events = [];
    const lock = new Lock();

    await lock.executeSynchronized(async () => {
      events.push('lock');
    });
    events.push('after');

    expect(events).to.deep.equal(['lock', 'after']);
  });

  test('return value', async () => {
    const lock = new Lock();

    const value = await lock.executeSynchronized(async () => 'foo');

    expect(value).to.equal('foo');
  });

  test('two concurrent synchronizations', async () => {
    const events = [];
    const lock = new Lock();

    const p1 = lock
      .executeSynchronized(async () => {
        events.push('lock1');
        await sleep(10);
        events.push('lock2');
      })
      .then(() => {
        events.push('p1 resolve');
      });

    const p2 = lock
      .executeSynchronized(async () => {
        events.push('lock3');
      })
      .then(() => {
        events.push('p2 resolve');
      });

    await p1;
    await p2;
    events.push('after');

    expect(events).to.deep.equal(['lock1', 'lock2', 'p1 resolve', 'lock3', 'p2 resolve', 'after']);
  });

  test('deadlock', async () => {
    const lock = new Lock();

    const promise = lock.executeSynchronized(async () => {
      await lock.executeSynchronized(async () => {
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

  test('errors do not break the lock', async () => {
    const lock = new Lock();

    let p1Status, p2Status;

    const p1 = lock
      .executeSynchronized(async () => {
        throw new Error();
      })
      .then(
        () => {
          p1Status = 'resolved';
        },
        () => {
          p1Status = 'rejected';
        }
      );

    const p2 = lock
      .executeSynchronized(async () => {
        /* No-op. */
      })
      .then(
        () => {
          p2Status = 'resolved';
        },
        () => {
          p2Status = 'rejected';
        }
      );

    await p1;
    await p2;

    expect(p1Status).to.equal('rejected');
    expect(p2Status).to.equal('resolved');
  });

  test('errors are propagated with stack traces', async () => {
    const lock = new Lock();

    const throwsError = async () => {
      throw new Error();
    };

    let error: Error;
    const callLock = async () => {
      try {
        await lock.executeSynchronized(async () => {
          await throwsError();
        });
      } catch (err: any) {
        error = err;
        throw error;
      }
    };

    await expectToThrow(() => callLock());

    expect(error!.stack!.includes('throwsError')).to.be.true;
    expect(error!.stack!.includes('callLock')).to.be.true;
  }).skipEnvironments('webkit');
});

class TestClass {
  constructor(private events: string[]) {}

  @synchronized
  async foo() {
    this.events.push('foo start');
    await sleep(10);
    this.events.push('foo end');
  }

  @synchronized
  async bar() {
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
