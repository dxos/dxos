//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';
import browser from 'webextension-polyfill';

Bridge.allowWindowMessaging('dxos.devtools');

Bridge.onMessage('extension.inject-client-script', () => {
  console.log('[DXOS devtools] Injecting client API...');

  const script = document.createElement('script');
  script.src = browser.runtime.getURL('content-script/init.js');
  document.documentElement.appendChild(script);
  script.parentElement?.removeChild(script);
});

console.log('[DXOS devtools] Content-script initialized.');
