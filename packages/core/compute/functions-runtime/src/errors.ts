//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class FunctionServiceError extends BaseError.extend('FunctionServiceError') {}

export class ServiceNotAvailableError extends BaseError.extend('ServiceNotAvailableError') {}

export class ProcessNotFoundError extends BaseError.extend('ProcessNotFoundError') {}
