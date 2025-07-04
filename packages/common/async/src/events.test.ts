//
// Copyright 2020 DXOS.org
//

// import { setFlagsFromString } from 'node:v8';
// import { runInNewContext } from 'node:vm';
import { describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';

import { Event } from './events';
import { sleep } from './timeout';

describe('Event', () => {
  test('#debounce', async () => {
    const event = new Event<boolean>();

    let pureCount = 0;
    let debounceCount = 0;

    event.on(() => {
      pureCount++;
    });

    const debounced = event.debounce(200);
    debounced.on(() => {
      debounceCount++;
    });

    const mainPromise = event.waitForCount(3);
    const debouncePromise = debounced.waitForCount(1);

    event.emit(true);
    event.emit(true);
    event.emit(true);

    await sleep(5);

    expect(pureCount).to.equal(3);
    expect(debounceCount).to.equal(0);

    event.emit(true);
    event.emit(true);

    await mainPromise;
    await debouncePromise;

    expect(pureCount).to.equal(5);
    expect(debounceCount).to.equal(1);
  });

  test('subscribe context', async () => {
    const event = new Event<number>();
    const ctx = new Context();

    const received: number[] = [];
    event.on(ctx, (num) => {
      received.push(num);
    });

    event.emit(1);
    event.emit(2);
    void ctx.dispose();
    event.emit(3);
    event.emit(4);

    await sleep(2);

    expect(received).to.deep.equal([1, 2]);
  });

  test('errors are propagated to context', async () => {
    const event = new Event<number>();
    let error!: Error;
    const ctx = new Context({
      onError: (err) => {
        error = err;
      },
    });

    event.on(ctx, () => {
      throw new Error('test');
    });

    event.emit(1);

    await sleep(2);

    expect(error.message).to.equal('test');
  });

  test('emitAsync', async () => {
    const event = new Event<number>();
    let called = 0;
    event.on(async (num) => {
      await sleep(10);
      called++;
    });

    await event.emitAsync(1);
    expect(called).to.equal(1);

    // TODO(dmaretskyi): Disabled for now.
    // expect(() => event.emit(1)).to.throw(TypeError);
  });

  // test.skip('weak', async () => {
  //   setFlagsFromString('--expose_gc');
  //   const gc = runInNewContext('gc'); // nocommit

  //   let called = 0;
  //   let callback: (() => void) | null = () => {
  //     called++;
  //   };

  //   const event = new Event();
  //   event.on(new Context(), callback, { weak: true });

  //   event.emit();
  //   expect(called).to.equal(1);

  //   callback = null;
  //   while (event.listenerCount() > 0) {
  //     gc();
  //     await sleep(5);
  //   }

  //   event.emit();
  //   expect(called).to.equal(1);
  // });
});
