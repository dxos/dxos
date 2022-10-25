//
// Copyright 2021 DXOS.org
//

import { DXOSError } from '@dxos/debug';

export class InvalidConfigError extends DXOSError {
  constructor(message: string) {
    super('INVALID_CONFIG', message);
  }
}
