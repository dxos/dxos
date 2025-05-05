//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';

import { ClientCapabilities } from './capabilities';

export default (context: PluginsContext) => {
  const client = context.requestCapability(ClientCapabilities.Client);

  // NOTE: Migrations are currently unidirectional and idempotent.
  const unsubscribe = effect(() => {
    const migrations = Array.from(new Set(context.requestCapabilities(ClientCapabilities.Migration).flat()));
    const spaces = client.spaces.get();
    void Promise.all(spaces.map((space) => space.db.runMigrations(migrations)));
  });

  return contributes(Capabilities.Null, null, () => unsubscribe());
};
