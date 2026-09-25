//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Routine command failed. The underlying failure, where there is one, is the `cause`. */
export class RoutineCommandError extends BaseError.extend('RoutineCommandError', 'Routine command failed.') {}
