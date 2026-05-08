//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { defineObjectMigration } from '@dxos/client/echo';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { Kanban } from '#types';

/**
 * v0.1.0 → v0.2.0: nests the existing `view` ref under a `spec: { kind: 'view', view }`
 * discriminated union. v0.2.0 introduced an items-variant for externally-synced kanbans;
 * pre-migration objects were all view-based by construction.
 */
const migrations = [
  defineObjectMigration({
    from: Kanban.KanbanV1,
    to: Kanban.Kanban,
    transform: async (from) => ({
      name: from.name,
      arrangement: from.arrangement,
      spec: { kind: 'view' as const, view: from.view },
    }),
    onMigration: async () => {},
  }),
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
