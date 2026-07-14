//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type Migration } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

// `Cursor` (@dxos/cursor) bumped 0.1.0 → 0.2.0 to become a flat object with no migration path, so
// existing cursors are abandoned rather than migrated.
export const migrations: Migration.ObjectMigration[] = [];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
