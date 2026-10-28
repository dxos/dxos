//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';

/** The canary space could not be opened or read. */
export class CanarySpaceError extends Data.TaggedError('CanarySpaceError')<{ readonly message: string }> {}
