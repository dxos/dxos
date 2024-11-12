//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';
import browser from 'webextension-polyfill';

const main = async () => {
  const sandbox = document.createElement('iframe');
  sandbox.src = browser.runtime.getURL('/sandbox.html');
  window.document.body.appendChild(sandbox);
};

void main();
