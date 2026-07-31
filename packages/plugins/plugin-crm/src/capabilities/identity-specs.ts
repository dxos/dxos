//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { organizationIdentitySpec, personIdentitySpec } from '@dxos/extractor-lib';
import { SpaceCapabilities } from '@dxos/plugin-space';

/**
 * Contributes the identity rules for the types this plugin owns, which is what enables the
 * Duplicates tab for Person and Organization in the database type article.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.IdentitySpec, personIdentitySpec),
      Capability.contributes(SpaceCapabilities.IdentitySpec, organizationIdentitySpec),
    ];
  }),
);
