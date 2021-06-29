//
// Copyright 2021 DXOS.org
//

import { browser } from 'webextension-polyfill-ts';

// declare var browser: any; // TODO(rzadp): Proper TS types

(() => {
  const port = browser.runtime.connect();

  const onMessageCb = (message: any) => {
    console.log('message in content script received from the background', message)

    // TODO: send back to app.
  }

  port.onMessage.addListener(onMessageCb);

  window.addEventListener("message", (event) => {
    console.log('message in content script received from the app', event);
    if (event?.data?.payload) {
      port.postMessage(event.data.payload); // passing through the payload to background script
    } else {
      console.warn('Invalid data, not passing through to background script.')
    }
  });
})();
