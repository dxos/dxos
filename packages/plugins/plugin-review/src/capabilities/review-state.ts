//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ReviewCapabilities } from '#types';
import { ReviewEvents } from '#types';

export const ReviewState = Capability.makeModule(
  'ReviewState',
  {
    provides: [ReviewCapabilities.ReviewRenderPolicy],
    activatesOn: ReviewEvents.Start,
    environments: ['node'],
  },
  Effect.fnUntraced(function* () {
    // Per-object version view state now lives in the ViewState `viewAspect` (per-session, keyed by
    // object id); this module only contributes the review render policy.
    return Capability.contribute(ReviewCapabilities.ReviewRenderPolicy, ReviewCapabilities.defaultReviewRenderPolicy);
  }),
);
