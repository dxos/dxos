//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Pipeline operation failed. The underlying failure, where there is one, is the `cause`. */
export class PipelineError extends BaseError.extend('PipelineError', 'Pipeline operation failed.') {}
