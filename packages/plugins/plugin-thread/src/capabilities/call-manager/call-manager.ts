//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CallManager } from '../../calls';
import { ThreadCapabilities } from '../../types';

export default Capability.makeModule(async (context: Capability.PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const callManager = new CallManager(client);
  await callManager.open();

  return Capability.contributes(ThreadCapabilities.CallManager, callManager, () => {
    void callManager.close();
  });
});
