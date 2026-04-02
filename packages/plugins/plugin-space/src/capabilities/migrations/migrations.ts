//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LegacySpaceProperties, SpaceProperties } from '@dxos/client-protocol';
import { defineObjectMigration } from '@dxos/client/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

const SpacePropertiesMigration = defineObjectMigration({
  from: LegacySpaceProperties,
  to: SpaceProperties,
  transform: async (from) => {
    const { id, ...rest } = from as any;
    return rest;
  },
  onMigration: async () => {},
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, [SpacePropertiesMigration]);
  }),
);
