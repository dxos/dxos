//
// Copyright 2021 DXOS.org
//

import { browser } from 'webextension-polyfill-ts';

(() => {
  const port = browser.runtime.connect();

  const onMessageCb = (message: any) => {
    console.log('message in content script received from the background', message)

    // TODO: send back to app.
  }

  port.onMessage.addListener(onMessageCb);

  window.addEventListener("message", (event) => {
    if (event?.data?.payload) {
      console.log('message in content script received from the app', event);
      port.postMessage(event.data.payload); // passing through the payload to background script
    }
  });
})();
