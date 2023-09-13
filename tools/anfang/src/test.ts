//
// Copyright 2023 DXOS.org
//

import { forkDaemon } from '.';

const daemon = forkDaemon({
  script: __filename,
});

let invocations = 0;

const add = daemon.function(async (a, b) => {
  return {
    result: a + b,
    invocations: ++invocations,
  };
});

const _length = daemon.function(async (str) => {
  return {
    result: str.length,
    invocations: ++invocations,
  };
});

if (!daemon.isWorker) {
  void (async () => {
    console.log(await add(1, 2));

    // console.log(await length(randomBytes(16_000).toString('hex')));
  })();
}
