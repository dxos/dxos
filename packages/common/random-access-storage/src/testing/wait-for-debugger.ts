//
// Copyright 2024 DXOS.org
//

import { sleep } from '@dxos/async';

/**
 * Will wait for the debugger to be attached and stop on the breakpoint.
 * You can then press "step-out" to return to the caller.
 */
export const waitForDebugger = async () => {
  while (true) {
    const before = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const after = performance.now();
    if (after - before > 100) {
      break;
    }
    await sleep(100);
  }
};
