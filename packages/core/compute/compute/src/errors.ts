//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

// Errors from @dxos/operation.

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

// Errors from @dxos/functions.

export class ServiceNotAvailableError extends BaseError.extend('ServiceNotAvailable', 'Service not available') {
  constructor(service: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { service }, ...options, message: `Service not available: ${service}` });
  }
}

export class FunctionNotFoundError extends BaseError.extend('FunctionNotFound', 'Function not found') {
  constructor(functionKey: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { function: functionKey }, ...options });
  }
}

export class FunctionError extends BaseError.extend('FunctionError', 'Function invocation error') {}

export class InvalidOperationInputError extends BaseError.extend(
  'InvalidOperationInput',
  'Operation input did not match schema',
) {}

export class InvalidOperationOutputError extends BaseError.extend(
  'InvalidOperationOutput',
  'Operation output did not match schema',
) {}

export class TriggerStateNotFoundError extends BaseError.extend('TriggerStateNotFound', 'Trigger state not found') {}
