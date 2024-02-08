import { test } from 'vitest';

test('sanity', ({ expect }) => {
  expect(2 + 2).toBe(4);
});

test.skip('debugger', async () => {
  await waitForDebugger();
});

/**
 * Will wait for the debugger to be attached and stop on the breakpoint.
 * You can then press "step-out" to return to the caller.
 */
const waitForDebugger = async () => {
  while (true) {
    const before = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const after = performance.now();
    if (after - before > 100) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};
