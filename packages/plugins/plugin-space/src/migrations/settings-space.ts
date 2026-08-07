//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';

import { ensureSpacesOrder, readSpacesOrder } from '../util/settings-space';

/**
 * Move app configuration out of the legacy personal space and into the settings space: the
 * cross-space ordering, the default-space designation, and the space's display name (which used to
 * come from a translation because the space had no name of its own).
 *
 * Idempotent — every step is a no-op once the settings space already carries the value — so it is
 * safe to re-run when a legacy space is discovered after the settings space.
 */
export const migrateToSettingsSpace = Effect.fnUntraced(function* ({
  settingsSpace,
  legacySpace,
}: {
  settingsSpace: Space;
  legacySpace?: Space;
}) {
  if (!legacySpace) {
    yield* ensureSpacesOrder(settingsSpace);
    return;
  }

  yield* Effect.promise(() => legacySpace.waitUntilReady());
  yield* ensureSpacesOrder(settingsSpace, yield* readSpacesOrder(legacySpace));

  if (!AppSpace.readDefaultSpaceId(settingsSpace)) {
    AppSpace.setDefaultSpaceId(settingsSpace, legacySpace.id);
  }

  if (!legacySpace.properties.name) {
    Obj.update(legacySpace.properties, (properties) => {
      properties.name = AppSpace.DEFAULT_SPACE_NAME;
    });
  }
});
