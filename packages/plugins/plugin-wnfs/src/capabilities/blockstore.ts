//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import * as Blockstore from '../blockstore';

import { WnfsCapabilities } from './capabilities';

export default Capability.makeModule(async (context: Capability.PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const apiHost = client.config.values.runtime?.services?.edge?.url || 'http://localhost:8787';
  const blockstore = Blockstore.create(apiHost);
  await blockstore.open();

  return Capability.contributes(WnfsCapabilities.Blockstore, blockstore);
});
