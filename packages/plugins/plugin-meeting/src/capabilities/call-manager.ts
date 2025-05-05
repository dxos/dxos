//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { MeetingCapabilities } from './capabilities';
import { CallManager } from '../state';

export default async (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);
  const callManager = new CallManager(client);
  await callManager.open();

  return contributes(MeetingCapabilities.CallManager, callManager, () => {
    void callManager.close();
  });
};
