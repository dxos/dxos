//
// Copyright 2021 DXOS.org
//

import { browser } from 'webextension-polyfill-ts';

(() => {
  const port = browser.runtime.connect();

  port.onMessage.addListener((message, port) => {
    console.log('message in content script received from the background', message)

    // passing through back to the app
    window.postMessage({ 'payload': message }, '*')
  });

  window.addEventListener("message", (event) => {
    if (event?.data?.payload) {
      console.log('message in content script received from the app', event);
      port.postMessage(event.data.payload); // passing through the payload to background script
    }
  });
})();
