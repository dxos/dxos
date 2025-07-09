//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginContext, Capabilities } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DataType } from '@dxos/schema';

export default async (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  await client.spaces.waitUntilReady();

  const defaultSpace = client.spaces.default;
  await defaultSpace.waitUntilReady();

  // Create root collection structure.
  defaultSpace.properties[DataType.Collection.typename] = Ref.make(Obj.make(DataType.Collection, { objects: [] }));
  if (Migrations.versionProperty) {
    defaultSpace.properties[Migrations.versionProperty] = Migrations.targetVersion;
  }

  return contributes(Capabilities.Null, null);
};
