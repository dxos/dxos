//
// Copyright 2021 DXOS.org
//

import { DXOSError } from '@dxos/debug';

// TODO(burdon): Consolidate with @dxos/echo-db.

export class InvalidConfigurationError extends DXOSError {
  constructor(message: string) {
    super('INVALID_CONFIGURATION', message);
  }
}

export class RemoteServiceConnectionTimeout extends DXOSError {
  constructor(message?: string) {
    super('REMOTE_SERVICE_CONNECTION_TIMEOUT', message);
  }
}
