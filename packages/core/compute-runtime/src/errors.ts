//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class ServiceNotAvailableError extends BaseError.extend('ServiceNotAvailableError') {}

export class ProcessNotFoundError extends BaseError.extend('ProcessNotFoundError') {}
