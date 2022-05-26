//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import browser from 'webextension-polyfill';

const log = debug('dxos:extension:devtools');
const error = log.extend('error');

// eslint-disable-next-line prefer-const
let loadCheckInterval: NodeJS.Timeout;
let panelCreated = false;
let checkCount = 0;

const createPanel = () => {
  log('Attempting to create panel...');
  if (panelCreated || checkCount++ > 120) {
    return;
  }

  // TODO(wittjosiah): Switch to using webextension-polyfill once types are improved.
  chrome.devtools.inspectedWindow.eval(
    '!!(window.__DXOS__);',
    async (result, exception) => {
      // TODO(elmasse): How should we better handle this error?
      if (exception) {
        error(`DXOS hook exception: ${exception}`);
      }

      if (!result || panelCreated) {
        log('DXOS hook not yet available...');
        return;
      }

      if (loadCheckInterval) {
        clearInterval(loadCheckInterval);
      }

      panelCreated = true;
      await browser.devtools.panels.create('DXOS', '', 'panel.html');
      log('Panel created.');
    }
  );
};

browser.devtools.network.onNavigated.addListener(createPanel);
loadCheckInterval = setInterval(createPanel, 1000);
createPanel();
