//
// Copyright 2020 DXOS.org
//

let afterTestCallbacks: (() => any | Promise<any>)[] = [];

export function afterTest (cb: () => any | Promise<any>) {
  afterTestCallbacks.push(cb);
}

afterEach(async () => {
  const promise = Promise.all(afterTestCallbacks.map(cb => cb()));
  afterTestCallbacks = [];
  await promise;
});
