//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { sleep } from './async.js';
import { Event } from './event.js';

describe('Event', function () {
  it('#debounce', async function () {
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

    await sleep(100);

    expect(pureCount).to.equal(3);
    expect(debounceCount).to.equal(0);

    event.emit(true);
    event.emit(true);

    await mainPromise;
    await debouncePromise;

    expect(pureCount).to.equal(5);
    expect(debounceCount).to.equal(1);
  });
});
