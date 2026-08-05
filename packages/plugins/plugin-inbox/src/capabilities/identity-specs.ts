//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { identitySpecs } from '@dxos/extractor-lib';
import { SpaceCapabilities } from '@dxos/plugin-space';

/**
 * Identity rules for Person and Organization — the types this plugin materialises from mail.
 *
 * They live here rather than with the article that renders the duplicates review, or with the CRM
 * plugin that also displays them, because this is where the duplicates come from: whoever creates
 * the objects owns the rule for deciding when two of them are the same. It also means the review is
 * available wherever mail sync is, rather than depending on an optional plugin being installed.
 * Other plugins add rules for their own types by contributing to the same capability.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return identitySpecs.map((spec) => Capability.contributes(SpaceCapabilities.IdentitySpec, spec));
  }),
);
