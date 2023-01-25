//
// Copyright 2020 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

let panelCreated = false;

const createPanel = async () => {
  if (panelCreated) {
    log('Panel already created.');
    return;
  }

  log('Attempting to create panel...');
  await browser.devtools.panels.create('DXOS', '', browser.runtime.getURL('/panel.html'));
  panelCreated = true;
  log('Panel created.');
};

// TODO(wittjosiah): Is this needed?
browser.devtools.network.onNavigated.addListener(createPanel);

void createPanel();
