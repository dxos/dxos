//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import { httpTransport, installRuntime, type Transport } from './runtime-core.ts';

const hmrTransport: Transport = (chunk) => {
  if (import.meta.hot == null) {
    httpTransport(chunk);
    return;
  }
  import.meta.hot.send('dxos-plugin:log', { chunk });
};

const handle = installRuntime(hmrTransport);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    handle.flush();
  });
}
