//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class ServiceNotAvailableError extends BaseError.extend('SERVICE_NOT_AVAILABLE') {
  constructor(serviceName: string) {
    super(`Service not available: ${serviceName}`);
  }
}

export class FunctionNotFoundError extends BaseError.extend('FUNCTION_NOT_FOUND') {
  constructor(functionKey: string) {
    super(`Function not found: ${functionKey}`);
  }
}

export class FunctionError extends BaseError.extend('FUNCTION_ERROR') {}
