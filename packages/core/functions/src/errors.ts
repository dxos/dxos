import { BaseError } from '@dxos/errors';

export class ServiceNotAvailableError extends BaseError.extend('SERVICE_NOT_AVAILABLE') {
  constructor(serviceName: string) {
    super(`Service not available: ${serviceName}`);
  }
}
