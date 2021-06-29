//
// Copyright 2021 DXOS.org
//

import { browser } from 'webextension-polyfill-ts';

(() => {
  const port = browser.runtime.connect(); // Port to extension's background script.

  port.onMessage.addListener((message, port) => {
    // Passing through a message from background script back to the app.
    window.postMessage({ 'payloadFromContentScriptToApp': message }, '*')
  });

  window.addEventListener("message", (event) => {
    const ourPayload = event?.data?.payloadFromAppToContentScript
    if (ourPayload) {
      // passing through a message from the App to the background script.
      port.postMessage(ourPayload);
    }
  });
})();
