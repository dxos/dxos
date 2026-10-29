//
// Copyright 2026 DXOS.org
//

import type * as Tour from '@dxos/app-toolkit/Tour';

/**
 * `helpSteps` is a loader rather than an array so the tour's step definitions - and the operations
 * their `before` hooks invoke - stay out of the host's eager boot graph.
 */
export type SupportPluginOptions = { helpSteps?: () => Promise<Tour.Step[]> };
