//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

export class ServiceNotAvailableError extends BaseError.extend('SERVICE_NOT_AVAILABLE') {
  constructor(serviceName: string) {
    super(`Service not available: ${serviceName}`);
  }
}

export class FunctionError extends BaseError.extend('FUNCTION_ERROR') {
  constructor(message: string, options?: BaseErrorOptions) {
    super(message, options);
  }
}
