//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Migration, Obj, Ref, Relation } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Cursor } from '@dxos/types';

import { SyncBinding } from '#types';

export const migrations = [
  // 0.1.0 → 0.2.0: cursor + run status moved from inline binding fields to a referenced `Cursor`
  // object. Drop the old inline value and attach a fresh empty cursor so the next run re-syncs from
  // scratch (idempotent — no duplicates). The binding's endpoints, `remoteId`, `name`, `options`, and
  // `snapshots` are preserved, so no binding is lost.
  Migration.define({
    from: SyncBinding.SyncBindingV1,
    to: SyncBinding.SyncBinding,
    transform: async (from, { db }) => {
      const cursor = db.add(Cursor.make());
      return {
        // Preserve the relation endpoints (source connection, target root object).
        [Relation.Source]: Relation.getSource(from),
        [Relation.Target]: Relation.getTarget(from),
        remoteId: from.remoteId,
        name: from.name,
        snapshots: from.snapshots,
        options: from.options,
        cursor: Ref.make(cursor),
      };
    },
    onMigration: async ({ object }) => {
      // Own the cursor: cascade-delete with the binding (matches `SyncBinding.make`).
      const cursor = object.cursor.target;
      if (cursor) {
        Obj.setParent(cursor, object);
      }
    },
  }),
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
