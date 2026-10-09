//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Terminal harness failed. The underlying failure, where there is one, is the `cause`. */
export class TerminalTestError extends BaseError.extend('TerminalTestError', 'Terminal harness failed.') {}
