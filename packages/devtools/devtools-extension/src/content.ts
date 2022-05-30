//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import browser from 'webextension-polyfill';

const log = debug('dxos:extension:content');

const port = browser.runtime.connect({ name: 'content' });

// Forward messages from background script to injected script.
port.onMessage.addListener(message => {
  log(`Received message from background: ${message}`);
  if (message.type === 'extension.inject-client-script') {
    log('Injecting client RPC server script...');

    const script = document.createElement('script');
    script.src = browser.runtime.getURL('inject.js');
    document.documentElement.appendChild(script);
    script.parentElement?.removeChild(script);

    return;
  }

  window.postMessage({
    data: message,
    source: 'content-script'
  }, '*');
});

// Forward messages from injected script to background script.
window.addEventListener('message', event => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  if (
    typeof message !== 'object' ||
    message === null ||
    message.source !== 'injected-script'
  ) {
    return;
  }

  log(`Received message from injected script: ${message}`);
  port.postMessage(message);
});

log('Content script initialized.');
