//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { getPersonalSpace } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
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
      return Capability.contributes(Capabilities.Null, null);
    }

    const existing = yield* Effect.tryPromise(() => space.db.query(Filter.type(Support.Welcome)).run());
    if (existing.length === 0) {
      space.db.add(Support.makeWelcome());
    }

    return Capability.contributes(Capabilities.Null, null);
  }),
);
