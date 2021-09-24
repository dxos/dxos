//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { createWindowPort } from '../utils';
import { RpcClientAPI } from './client-api';
import { createDevtoolsHost, DevtoolsHostEvents } from './handlers';

Bridge.setNamespace('dxos.devtools');
Bridge.allowWindowMessaging('dxos.devtools');

const init = async () => {
  if ((window as any).__DXOS__) {
    console.log('[DXOS devtools] Init client API');
    const port = createWindowPort();
    const devtoolsEvents = new DevtoolsHostEvents();
    const devtoolsHost = createDevtoolsHost((window as any).__DXOS__, devtoolsEvents);
    const clientApi = new RpcClientAPI(port, devtoolsHost, devtoolsEvents);
    await clientApi.run();
  }
};

void init();
