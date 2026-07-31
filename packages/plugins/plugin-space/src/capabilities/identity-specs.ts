//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { identitySpecs } from '@dxos/extractor-lib';

import { SpaceCapabilities } from '../types';

/**
 * Identity rules for the types every space has — Person and Organization, from `@dxos/types`.
 *
 * These live here rather than in the plugin that renders them because the duplicates review is part
 * of the database article, and the duplicates themselves come from mail sync: gating the tab on an
 * optional plugin being installed would hide it from exactly the profiles that need it. Other
 * plugins add rules for their own types by contributing to the same capability.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return identitySpecs.map((spec) => Capability.contributes(SpaceCapabilities.IdentitySpec, spec));
  }),
);
