//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class InvokerNotInitializedError extends BaseError.extend(
  'InvokerNotInitializedError',
  'Invoker not initialized',
) {
  constructor() {
    super();
  }
}

export class NoHandlerError extends BaseError.extend('NoHandlerError', 'No handler found for operation. ') {
  constructor(operationKey: string) {
    super({ context: { operationKey } });
  }
}
