//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { identitySpecs } from '@dxos/extractor-lib';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

export const IdentitySpecs = Capability.makeModule(
  'IdentitySpecs',
  { provides: [SpaceCapabilities.IdentitySpec] },
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(SpaceCapabilities.IdentitySpec, identitySpecs);
  }),
);
