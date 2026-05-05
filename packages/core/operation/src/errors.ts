//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

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

export class FunctionNotFoundError extends BaseError.extend('FunctionNotFound', 'Function not found') {
  constructor(functionKey: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { function: functionKey }, ...options });
  }
}
