//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Eval run failed. The underlying failure, where there is one, is the `cause`. */
export class EvalRunError extends BaseError.extend('EvalRunError', 'Eval run failed.') {}
