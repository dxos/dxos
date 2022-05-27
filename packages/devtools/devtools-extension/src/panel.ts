//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import browser from 'webextension-polyfill';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { defs } from '@dxos/config';
import { initialize, Shell } from '@dxos/devtools';

import { wrapPort } from './utils';

const log = debug('dxos:extension:panel');
const TIMEOUT = 5000;

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

const waitForRpcServer = () => {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();

    function check () {
      // TODO(wittjosiah): Switch to using webextension-polyfill once types are improved.
      chrome.devtools.inspectedWindow.eval(
        '!!(window.__DXOS__.clientRpcReady);',
        (result, isException) => {
          if (!result || isException) {
            if (Date.now() - start > TIMEOUT) {
              reject(new Error('Timeout on waiting for client RPC server to initialize.'));
            } else {
              log('Devtools not ready, will check again...');
              setTimeout(check, 50);
            }
          } else {
            log('Devtools ready.');
            resolve();
          }
        }
      );
    }

    check();
  });
};

const init = async () => {
  initialize(shell);

  log('Initialize client RPC server starting...');
  const port = browser.runtime.connect({ name: `panel-${browser.devtools.inspectedWindow.tabId}` });
  port.postMessage({ type: 'extension.inject-client-script' });

  const rpcPort = wrapPort(port);
  const client = new Client({
    runtime: {
      client: {
        mode: defs.Runtime.Client.Mode.REMOTE
      }
    }
  }, { rpcPort });

  await waitForRpcServer();
  await client.initialize();
  clientReady.emit(client);
};

void init();
