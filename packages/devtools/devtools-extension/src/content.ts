//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import browser from 'webextension-polyfill';

const log = debug('dxos:extension:content');

const port = browser.runtime.connect({ name: 'content' });

// Forward messages from background script to DXOS Client.
port.onMessage.addListener(message => {
  log('Received message from background:', message);

  window.postMessage({
    data: message.data,
    source: 'content-script'
  }, '*');
});

// Forward messages from DXOS Client to background script.
window.addEventListener('message', event => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  if (
    typeof message !== 'object' ||
    message === null ||
    message.source !== 'dxos-client'
  ) {
    return;
  }

  log('Received message from DXOS Client:', message);
  port.postMessage(message);
});

log('Content script initialized.');
