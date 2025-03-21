//
// Copyright 2020 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { waitForClientHook } from './dxos-hook';

log('Initialize panel starting...');

const port = browser.runtime.connect({
  name: `panel-${browser.devtools.inspectedWindow.tabId}`,
});

const sandbox = document.createElement('iframe');
sandbox.src = browser.runtime.getURL('/sandbox.html');
window.document.body.appendChild(sandbox);

window.addEventListener('message', async (event) => {
  const message = event.data;
  if (typeof message !== 'object' || message === null || message.source !== 'sandbox') {
    return;
  }

  if (message.data === 'open-rpc') {
    log('Opening RPC Server...');
    await waitForClientHook();
    await browser.devtools.inspectedWindow.eval('window.__DXOS__.openClientRpcServer()');
    sandbox.contentWindow?.postMessage({ data: 'open-rpc', source: 'panel' }, '*');
    return;
  }

  log('Received message from sandbox:', message);
  port.postMessage(message);
});

port.onMessage.addListener((message: any) => {
  log('Received message from background:', message);
  sandbox.contentWindow?.postMessage({ data: message.data, source: 'panel' }, '*');
});

browser.devtools.network.onNavigated.addListener(() => {
  window.location.reload();
});

log('initialized panel');
