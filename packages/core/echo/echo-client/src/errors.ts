//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** ECHO client operation failed. The underlying failure, where there is one, is the `cause`. */
export class EchoClientError extends BaseError.extend('EchoClientError', 'ECHO client operation failed.') {}
