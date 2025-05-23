//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginContext, Capabilities } from '@dxos/app-framework';
import { live, makeRef } from '@dxos/live-object';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CollectionType } from '../types';

export default async (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  await client.spaces.waitUntilReady();

  const defaultSpace = client.spaces.default;
  await defaultSpace.waitUntilReady();

  // Create root collection structure.
  defaultSpace.properties[CollectionType.typename] = makeRef(live(CollectionType, { objects: [], views: {} }));
  if (Migrations.versionProperty) {
    defaultSpace.properties[Migrations.versionProperty] = Migrations.targetVersion;
  }

  return contributes(Capabilities.Null, null);
};
