//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import browser from 'webextension-polyfill';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { defs } from '@dxos/config';
import { initialize, Shell } from '@dxos/devtools';

import { waitForDXOS, wrapPort } from './utils';

const log = debug('dxos:extension:panel');

const clientReady = new Event<Client>();

const shell: Shell = {
  connect (onConnect) {
    onConnect(clientReady);
  },

  tabId: browser.devtools.inspectedWindow.tabId,

  onReload (reloadFn) {
    browser.devtools.network.onNavigated.addListener(reloadFn);
  }
};

const init = async () => {
  initialize(shell);

  log('Initialize client RPC server starting...');
  const port = browser.runtime.connect({ name: `panel-${browser.devtools.inspectedWindow.tabId}` });
  const rpcPort = wrapPort(port);
  const client = new Client({
    runtime: {
      client: {
        mode: defs.Runtime.Client.Mode.REMOTE
      }
    }
  }, { rpcPort });

  await waitForDXOS();
  await browser.devtools.inspectedWindow.eval('window.__DXOS__.openClientRpcServer()');
  await client.initialize();
  log('Initialized client RPC server finished.');
  clientReady.emit(client);
};

void init();
