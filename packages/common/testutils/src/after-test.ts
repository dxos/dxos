//
// Copyright 2022 DXOS.org
//

let afterTestCallbacks: (() => any | Promise<any>)[] = [];

/**
 * Will execute the closure after the current test has finished running.
 *
 * Closures are executed from last to first.
 */
export const afterTest = (cb: () => any | Promise<any>) => {
  afterTestCallbacks.push(cb);
};

afterEach(async () => {
  for (let i = afterTestCallbacks.length - 1; i >= 0; i--) {
    await afterTestCallbacks[i]();
  }
  afterTestCallbacks = [];
});
