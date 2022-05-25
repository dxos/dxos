//
// Copyright 2020 DXOS.org
//

import browser from 'webextension-polyfill';

const port = browser.runtime.connect({ name: 'client' });

port.onMessage.addListener(message => {
  console.log('[content] port.onMessage', { message });

  if (message.type === 'extension.inject-client-script') {
    console.log('[DXOS devtools] Injecting client API...');

    const script = document.createElement('script');
    script.src = browser.runtime.getURL('inject.js');
    document.documentElement.appendChild(script);
    script.parentElement?.removeChild(script);

    return;
  }

  window.postMessage({
    data: message,
    source: 'dxos-devtools'
  }, '*');
});

window.addEventListener('message', (event) => {
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

  console.log('[content] window.message', { event });
  port.postMessage(message);
});

// port.onMessage.addListener((message, sender) => {
//   console.log('[DXOS devtools] Received message:', { message, sender });

// if (message.type === 'extension.inject-client-script') {
//   console.log('[DXOS devtools] Injecting client API...');

//   const script = document.createElement('script');
//   script.src = browser.runtime.getURL('inject.js');
//   document.documentElement.appendChild(script);
//   script.parentElement?.removeChild(script);
// }
// });

// const port = browser.runtime.connect();

// port.onMessage.addListener((message, port) => {
//   console.log('[DXOS devtools] onMessage', { message, port });
//   // if (message.type === 'extension.inject-client-script') {
//   //   console.log('[DXOS devtools] Injecting client API...');

//   //   const script = document.createElement('script');
//   //   script.src = browser.runtime.getURL('content-script/init.js');
//   //   document.documentElement.appendChild(script);
//   //   script.parentElement?.removeChild(script);
//   // }
// });

console.log('[DXOS devtools] Content-script initialized.');
