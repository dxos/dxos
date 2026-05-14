//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { getPersonalSpace } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Support } from '#types';

/**
 * Ensures a singleton {@link Support.Welcome} object exists in the personal space.
 * Activated on `SpaceEvents.PersonalSpaceReady`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const space = getPersonalSpace(client);
    if (!space) {
      log.warn('welcome-provisioner: no personal space');
      return Capability.contributes(Capabilities.Null, null);
    }

    const existing = yield* Effect.tryPromise(() => space.db.query(Filter.type(Support.Welcome)).run());
    log.info('welcome-provisioner', { existingCount: existing.length, spaceId: space.id });
    if (existing.length === 0) {
      const welcome = space.db.add(Support.makeWelcome());
      log.info('welcome-provisioner: added Welcome', { id: welcome.id });
    }

    return Capability.contributes(Capabilities.Null, null);
  }),
);
