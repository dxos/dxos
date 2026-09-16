//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Client service operation failed. The underlying failure, where there is one, is the `cause`. */
export class ClientServiceError extends BaseError.extend('ClientServiceError', 'Client service operation failed.') {}
