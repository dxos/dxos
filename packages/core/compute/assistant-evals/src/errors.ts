//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Eval run failed. The underlying failure, where there is one, is the `cause`. */
export class EvalError extends BaseError.extend('EvalError', 'Eval run failed.') {}
