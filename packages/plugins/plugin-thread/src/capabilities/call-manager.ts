//
// Copyright 2025 DXOS.org
//

import { type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CallManager } from '../calls';

import { ThreadCapabilities } from './capabilities';

export default defineCapabilityModule(async (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const callManager = new CallManager(client);
  await callManager.open();

  return contributes(ThreadCapabilities.CallManager, callManager, () => {
    void callManager.close();
  });
});
