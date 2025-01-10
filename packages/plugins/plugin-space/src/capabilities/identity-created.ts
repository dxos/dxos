//
// Copyright 2025 DXOS.org
//

import { contributes, type PluginsContext, Capabilities } from '@dxos/app-framework/next';
import { create, makeRef } from '@dxos/live-object';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CollectionType } from '../types';

export default (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);
  const defaultSpace = client.spaces.default;

  // Create root collection structure.
  defaultSpace.properties[CollectionType.typename] = makeRef(create(CollectionType, { objects: [], views: {} }));
  if (Migrations.versionProperty) {
    defaultSpace.properties[Migrations.versionProperty] = Migrations.targetVersion;
  }

  return contributes(Capabilities.Null, null);
};
