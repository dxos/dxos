//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

export class ServiceNotAvailableError extends BaseError.extend('ServiceNotAvailable', 'Service not available') {
  constructor(service: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { service }, ...options });
  }
}

export class FunctionNotFoundError extends BaseError.extend('FunctionNotFound', 'Function not found') {
  constructor(functionKey: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { function: functionKey }, ...options });
  }
}

export class FunctionError extends BaseError.extend('FunctionError', 'Function invocation error') {}

export class TriggerStateNotFoundError extends BaseError.extend('TriggerStateNotFound', 'Trigger state not found') {}
