//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { initPanel } from './init-panel';
import { createWindowPort } from '../utils';
import { createDevtoolsRpc } from './rpc-client';

(async () => {
  await Bridge.sendMessage('extension.inject-client-script', {}, 'content-script');
  initPanel(() => createDevtoolsRpc(createWindowPort()));
})();   
