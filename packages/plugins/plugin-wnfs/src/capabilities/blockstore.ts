//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { WnfsCapabilities } from './capabilities';
import * as Blockstore from '../blockstore';

export default async (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const apiHost = client.config.values.runtime?.services?.edge?.url || 'http://localhost:8787';
  const blockstore = Blockstore.create(apiHost);
  await blockstore.open();

  return contributes(WnfsCapabilities.Blockstore, blockstore);
};
