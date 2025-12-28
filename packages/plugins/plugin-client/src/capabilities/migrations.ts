//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

import { ClientCapabilities } from '../types';

export default Capability.makeModule((context) => {
  const registry = context.getCapability(Capabilities.AtomRegistry);
  const client = context.getCapability(ClientCapabilities.Client);

  // NOTE: Migrations are currently unidirectional and idempotent.
  const cancel = registry.subscribe(
    context.capabilities(ClientCapabilities.Migration),
    (_migrations: any[]) => {
      const migrations = Array.from(new Set(_migrations.flat()));
      const spaces = client.spaces.get();
      void Promise.all(spaces.map((space: any) => space.db.runMigrations(migrations)));
    },
    { immediate: true },
  );

  return Capability.contributes(Capabilities.Null, null, () => cancel());
});
