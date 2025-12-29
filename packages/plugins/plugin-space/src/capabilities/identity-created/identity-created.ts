//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Collection } from '@dxos/schema';

export default Capability.makeModule(async (context: Capability.PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  await client.spaces.waitUntilReady();

  const defaultSpace = client.spaces.default;
  await defaultSpace.waitUntilReady();

  // Create root collection structure.
  defaultSpace.properties[Collection.Collection.typename] = Ref.make(Collection.make());
  if (Migrations.versionProperty) {
    defaultSpace.properties[Migrations.versionProperty] = Migrations.targetVersion;
  }

  return Capability.contributes(Common.Capability.Null, null);
});
