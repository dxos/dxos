//
// Copyright 2026 DXOS.org
//

import { READY, isInit, startChildHost } from './child-host.ts';

// The entry of a worker host: a thread at the app's origin, which isolates faults but not trust.
globalThis.addEventListener('message', (event: MessageEvent) => {
  if (isInit(event.data)) {
    startChildHost(event.data);
  }
});
globalThis.postMessage(READY);
