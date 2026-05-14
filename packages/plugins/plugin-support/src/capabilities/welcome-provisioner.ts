//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { resolvePersonalSpace } from '@dxos/app-toolkit';
import { type Space } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Support } from '#types';

/**
 * Ensures a singleton {@link Support.Welcome} object exists in the personal space.
 * Activates on `ClientEvents.SpacesReady`, but the personal space may not be materialized at that
 * point — subscribe to `client.spaces` and provision once it appears. Idempotent: a Welcome object
 * is only added when none exists.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);

    let provisioned = false;
    const tryProvision = async (space: Space) => {
      if (provisioned) {
        return;
      }
      provisioned = true;
      await space.waitUntilReady();
      const existing = await space.db.query(Filter.type(Support.Welcome)).run();
      log.info('welcome-provisioner: queried', { existingCount: existing.length, spaceId: space.id });
      if (existing.length === 0) {
        const welcome = space.db.add(Support.makeWelcome());
        log.info('welcome-provisioner: added Welcome', { id: welcome.id });
      }
    };

    const resolved = resolvePersonalSpace(client);
    if (resolved) {
      void tryProvision(resolved.space);
      return Capability.contributes(Capabilities.Null, null);
    }

    log.info('welcome-provisioner: personal space not ready, subscribing');
    const subscription = client.spaces.subscribe(() => {
      const resolved = resolvePersonalSpace(client);
      if (resolved) {
        void tryProvision(resolved.space);
      }
    });

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => subscription.unsubscribe()),
    );
  }),
);
