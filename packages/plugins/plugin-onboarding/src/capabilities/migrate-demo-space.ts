//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { BRAMBLE_TEMPLATE_ID } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const migrate = () => {
      const migrated = AppSpace.migrateLegacyOnboardingSpaces(client, BRAMBLE_TEMPLATE_ID);
      if (migrated.length > 0) {
        log.info('recorded the demo space template', { spaces: migrated });
      }
    };

    const subscription = client.spaces.subscribe(() => migrate());
    yield* Effect.addFinalizer(() => Effect.sync(() => subscription.unsubscribe()));
    migrate();

    return [];
  }),
);
