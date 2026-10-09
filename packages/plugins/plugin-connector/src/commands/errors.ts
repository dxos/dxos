//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Connector command failed. The underlying failure, where there is one, is the `cause`. */
export class ConnectorCommandError extends BaseError.extend('ConnectorCommandError', 'Connector command failed.') {}
