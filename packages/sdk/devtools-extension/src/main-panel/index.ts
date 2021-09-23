//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { createDevtoolsPort } from '../utils';
import { initPanel } from './init-panel';
import { createDevtoolsRpc } from './rpc-client';

void (async () => {
  await Bridge.sendMessage('extension.inject-client-script', {}, 'content-script');
  const port = createDevtoolsPort();
  const devtoolsHost = await createDevtoolsRpc(port);
  initPanel(devtoolsHost);
})();
