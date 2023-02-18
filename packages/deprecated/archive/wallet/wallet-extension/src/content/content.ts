//
// Copyright 2021 DXOS.org
//

import browser from 'webextension-polyfill';

(() => {
  const port = browser.runtime.connect();

  port.onMessage.addListener((message, port) => {
    // Passing through back to the app.
    // TODO(unknown): Find out and document what is the type of message, and whether it is supported in chrome, firefox & safari.
    window.postMessage({ payloadFromContentScriptToApp: message }, '*');
  });

  window.addEventListener('message', (event) => {
    const payload = event?.data?.payloadFromAppToContentScript;
    if (payload) {
      port.postMessage(payload); // Passing through the payload to background script.
    }
  });
})();
