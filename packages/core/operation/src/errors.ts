//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class NoHandlerError extends BaseError.extend('NoHandlerError', 'No handler found for operation. ') {
  constructor(operationKey: string) {
    super({ context: { operationKey } });
  }
}
