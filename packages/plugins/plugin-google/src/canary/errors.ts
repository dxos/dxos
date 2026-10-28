//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';

/**
 * A failure of the canary's own making: bad settings, a grant for the wrong account, an unreadable mbox,
 * or a space it cannot open. Gmail's own failures stay `GoogleMailApiError`, so a report tells them apart.
 */
export class CanaryError extends Data.TaggedError('CanaryError')<{ readonly message: string }> {}
