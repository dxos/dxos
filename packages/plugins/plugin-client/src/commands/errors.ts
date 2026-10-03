//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A `dx` command could not complete. The underlying failure is the `cause`. */
export class CommandError extends BaseError.extend('CommandError', 'Command failed.') {}
