//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { sleep } from '@dxos/async';
import { Root } from '@dxos/kai';
import { log } from '@dxos/log';

import '@dxosTheme';

import '@dxos/kai/style.css';

// TODO(burdon): Document bootstrap sequence.
// TODO(burdon): Wrap all bootstrap code in a main function.

window.addEventListener('message', (event) => {
  const message = event.data;
  // Route messages from client to parent window.
  if (message.source === 'dxos-client') {
    window.parent.postMessage(message, '*');
  }

  // The dxos-client port expects messages from content-script with event.source === window.
  if (message.source === 'content-script' && event.source !== window) {
    window.postMessage(message, '*');
  }
});

/**
 * Detect global hook from App.
 */
const waitForDXOS = async (timeout = 5_000, interval = 500) => {
  while (timeout > 0) {
    const isReady = !!(window as any).__DXOS__;
    if (isReady) {
      return;
    }

    log('DXOS hook not yet available...');
    await sleep(interval);
    timeout -= interval;
  }

  throw new Error('DXOS hook not available.');
};

waitForDXOS()
  .then(() => {
    (window as any).__DXOS__.openClientRpcServer();
  })
  // TODO(burdon): Catch/throw?
  .catch((err) => {
    throw err;
  });

createRoot(document.getElementById('root')!).render(<Root />);
