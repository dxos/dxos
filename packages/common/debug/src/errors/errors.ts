//
// Copyright 2021 DXOS.org
//

import { DXOSError } from './dxos-error';

export class InvalidParameterError extends DXOSError {
  constructor (message?: string) {
    super('INVALID_PARAMETER', message);
  }
}

export class TimeoutError extends DXOSError {
  constructor (message?: string) {
    super('TIMEOUT', message);
  }
}
