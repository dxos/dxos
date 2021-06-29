//
// Copyright 2021 DXOS.org
//

import { browser } from 'webextension-polyfill-ts';

(() => {
  const port = browser.runtime.connect();

  port.onMessage.addListener((message, port) => {
    console.log('message in content script received from the background', message)

    // passing through back to the app
    window.postMessage({ 'payloadFromContentScriptToApp': message }, '*')
  });

  window.addEventListener("message", (event) => {
    const ourPayload = event?.data?.payloadFromAppToContentScript
    if (ourPayload) {
      port.postMessage(ourPayload); // passing through the payload to background script
    }
  });
})();
