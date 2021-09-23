//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { initPanel } from './init-panel';
import { createDevtoolsPort } from '../utils';
import { createDevtoolsRpc } from './rpc-client';

(async () => {
  await Bridge.sendMessage('extension.inject-client-script', {}, 'content-script');
  const port = createDevtoolsPort();
  const devtoolsHost = await createDevtoolsRpc(port);
  initPanel(devtoolsHost);
})();   
