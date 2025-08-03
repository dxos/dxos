//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';

import { ClientCapabilities } from './capabilities';

export default (context: PluginContext) => {
  const registry = context.getCapability(Capabilities.RxRegistry);
  const client = context.getCapability(ClientCapabilities.Client);

  // NOTE: Migrations are currently unidirectional and idempotent.
  const cancel = registry.subscribe(
    context.capabilities(ClientCapabilities.Migration),
    (_migrations) => {
      const migrations = Array.from(new Set(_migrations.flat()));
      const spaces = client.spaces.get();
      void Promise.all(spaces.map((space) => space.db.runMigrations(migrations)));
    },
    { immediate: true },
  );

  return contributes(Capabilities.Null, null, () => cancel());
};
