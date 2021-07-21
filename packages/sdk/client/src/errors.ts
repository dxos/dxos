//
// Copyright 2021 DXOS.org
//

import { DXOSError } from '@dxos/debug';

export class InvalidConfigurationError extends DXOSError {
  constructor (message: string) {
    super('INVALID_CONFIGURATION', message);
  }
}
