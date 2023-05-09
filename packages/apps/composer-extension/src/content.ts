//
// Copyright 2023 DXOS.org
//

import browser from 'webextension-polyfill';

console.log('Content script initialized.');

const sandbox = document.createElement('iframe');
// sandbox.setAttribute('sandbox', 'allow-scripts allow-same-origin');
sandbox.setAttribute('src', browser.runtime.getURL('/src/sandbox.html'));
document.body.appendChild(sandbox);
