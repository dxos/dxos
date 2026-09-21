//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { BRAMBLE_TEMPLATE_ID } from '../constants.ts';

/**
 * Records where the demo space came from in profiles that onboarded before templates did.
 *
 * Those spaces carry a tag instead, and a tag cannot be removed — it rides the space's admission
 * credential. Stamping the annotation is what lets everything else read a space's origin one way,
 * rather than checking the annotation and then falling back to a retired tag.
 *
 * Imports the id, not the template: the world behind it stays in its own chunk.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const migrated = AppSpace.migrateLegacyOnboardingSpaces(client, BRAMBLE_TEMPLATE_ID);
    if (migrated.length > 0) {
      log.info('recorded the demo space template', { spaces: migrated });
    }

    return [];
  }),
);
