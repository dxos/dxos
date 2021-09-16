//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';
import { browser } from 'webextension-polyfill-ts';

Bridge.setNamespace('dxos.devtools');
Bridge.allowWindowMessaging('dxos.devtools');

Bridge.onMessage('extension.inject-client-script', () => {
  console.log('[DXOS devtools] Injecting client API.');

  const script = document.createElement('script');
  script.src = browser.runtime.getURL('devtools-client-api/index.js');
  document.documentElement.appendChild(script);
});

console.log('[DXOS devtools] Content-script initialized');
