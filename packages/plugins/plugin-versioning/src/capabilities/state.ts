//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { VersioningCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Per-object version view state now lives in the ViewState `viewAspect` (per-session, keyed by
    // object id); this module only contributes the review render policy.
    return Capability.contributes(
      VersioningCapabilities.ReviewRenderPolicy,
      VersioningCapabilities.defaultReviewRenderPolicy,
    );
  }),
);
