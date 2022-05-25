//
// Copyright 2020 DXOS.org
//

// import Bridge from 'crx-bridge';
// import browser from 'webextension-polyfill';

// Bridge.allowWindowMessaging('dxos.devtools');

// Bridge.onMessage('extension.inject-client-script', () => {
//   console.log('[DXOS devtools] Injecting client API...');

//   const script = document.createElement('script');
//   script.src = browser.runtime.getURL('content-script/init.js');
//   document.documentElement.appendChild(script);
//   script.parentElement?.removeChild(script);
// });

import browser from 'webextension-polyfill';

const port = browser.runtime.connect({ name: 'client' });

port.onMessage.addListener(message => {
  console.log('[content] port.onMessage', { message });

  if (message.type === 'extension.inject-client-script') {
    console.log('[DXOS devtools] Injecting client API...');

    const script = document.createElement('script');
    script.src = browser.runtime.getURL('content-script/init.js');
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

console.log('[DXOS devtools] Content-script initialized.');
