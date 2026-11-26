//
// Copyright 2026 DXOS.org
//

import { READY, isInit, startChildHost } from './child-host.ts';

// The entry of a frame host: a sandboxed document with an opaque origin and no network.
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source === window.parent && isInit(event.data)) {
    startChildHost(event.data);
  }
});
window.parent.postMessage(READY, '*');
