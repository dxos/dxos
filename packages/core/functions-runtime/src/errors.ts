//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

export class ServiceNotAvailableError extends BaseError.extend('SERVICE_NOT_AVAILABLE', 'Service not available') {
  constructor(service: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { service }, ...options });
  }
}

export class FunctionNotFoundError extends BaseError.extend('FUNCTION_NOT_FOUND', 'Function not found') {
  constructor(functionKey: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { function: functionKey }, ...options });
  }
}

export class FunctionError extends BaseError.extend('FUNCTION_ERROR', 'Function invocation error') {}

export class TriggerStateNotFoundError extends BaseError.extend('TRIGGER_STATE_NOT_FOUND', 'Trigger state not found') {}
