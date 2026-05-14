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
    log.info('welcome-provisioner: activate');
    const client = yield* Capability.get(ClientCapabilities.Client);
    log.info('welcome-provisioner: got client');
    const space = getPersonalSpace(client);
    log.info('welcome-provisioner: got space', { hasSpace: !!space, spaceId: space?.id });
    if (!space) {
      log.warn('welcome-provisioner: no personal space');
      return Capability.contributes(Capabilities.Null, null);
    }

    log.info('welcome-provisioner: waiting for space ready');
    yield* Effect.tryPromise({
      try: () => space.waitUntilReady(),
      catch: (err) => {
        log.warn('welcome-provisioner: waitUntilReady failed', { err });
        return err as Error;
      },
    });
    log.info('welcome-provisioner: space ready, querying');
    const existing = yield* Effect.tryPromise({
      try: () => space.db.query(Filter.type(Support.Welcome)).run(),
      catch: (err) => {
        log.warn('welcome-provisioner: query failed', { err });
        return err as Error;
      },
    });
    log.info('welcome-provisioner: queried', { existingCount: existing.length, spaceId: space.id });
    if (existing.length === 0) {
      const welcome = space.db.add(Support.makeWelcome());
      log.info('welcome-provisioner: added Welcome', { id: welcome.id });
    }

    return Capability.contributes(Capabilities.Null, null);
  }),
);
