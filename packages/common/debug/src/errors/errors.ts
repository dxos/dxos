//
// Copyright 2021 DXOS.org
//

import { DXOSError } from './dxos-error';

export class InvalidParameterError extends DXOSError {
  constructor(message?: string) {
    super('DXOS_INVALID_PARAMETER', message);
  }
}

export class TimeoutError extends DXOSError {
  constructor(message?: string) {
    super('DXOS_TIMEOUT', message);
  }
}

export class InvalidStateError extends DXOSError {
  constructor(message = 'Invalid state.') {
    super('DXOS_INVALID_STATE', message);
  }
}
