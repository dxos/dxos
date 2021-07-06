//
// Copyright 2021 DXOS.org
//

import { browser } from 'webextension-polyfill-ts';

(() => {
  const port = browser.runtime.connect();

  port.onMessage.addListener((message, port) => {
    // passing through back to the app
    // TODO: Find out and document what is the type of message, and whether it is supported in chrome, firefox & safari.
    window.postMessage({ payload: message }, '*');
  });

  window.addEventListener('message', (event) => {
    const payload = event?.data?.payload;
    if (payload) {
      port.postMessage(payload); // passing through the payload to background script
    }
  });
})();
