//
// Copyright 2020 DXOS.org
//

let afterTestCallbacks: (() => void | Promise<void>)[] = [];

export function afterTest (cb: () => void | Promise<void>) {
  afterTestCallbacks.push(cb);
}

afterEach(async () => {
  const promise = Promise.all(afterTestCallbacks.map(cb => cb()));
  afterTestCallbacks = [];
  await promise;
});
