//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Observability operation failed. The underlying failure, where there is one, is the `cause`. */
export class ObservabilityError extends BaseError.extend('ObservabilityError', 'Observability operation failed.') {}
