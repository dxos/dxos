//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { MeetingCapabilities } from './capabilities';
import { CallManager } from '../state';

export default async (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const callManager = new CallManager(client);
  await callManager.open();

  return contributes(MeetingCapabilities.CallManager, callManager, () => {
    void callManager.close();
  });
};
