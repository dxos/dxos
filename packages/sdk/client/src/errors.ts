//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Client operation failed. The underlying failure, where there is one, is the `cause`. */
export class ClientError extends BaseError.extend('ClientError', 'Client operation failed.') {}
