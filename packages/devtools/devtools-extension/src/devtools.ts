//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import browser from 'webextension-polyfill';

import { waitForDXOS } from './utils/index.js';

const log = debug('dxos:extension:devtools');

let panelCreated = false;

const createPanel = async () => {
  if (panelCreated) {
    log('Panel already created.');
    return;
  }

  log('Attempting to create panel...');
  await waitForDXOS();
  await browser.devtools.panels.create('DXOS', '', 'panel.html');
  panelCreated = true;
  log('Panel created.');
};

// TODO(wittjosiah): Is this needed?
browser.devtools.network.onNavigated.addListener(createPanel);

void createPanel();
