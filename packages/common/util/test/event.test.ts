//
// Copyright 2020 DXOS.org
//

// dxos-testing-browser

import { sleep } from '../src/async/async';
import { Event } from '../src/async/event';

test('Event.debounce', async () => {
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

  expect(pureCount).toBe(3);
  expect(debounceCount).toBe(0);

  event.emit(true);
  event.emit(true);

  await mainPromise;
  await debouncePromise;

  expect(pureCount).toBe(5);
  expect(debounceCount).toBe(1);
});
