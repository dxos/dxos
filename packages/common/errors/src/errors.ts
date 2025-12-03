//
// Copyright 2025 DXOS.org
//

import { BaseError } from './base';

export class ApiError extends BaseError.extend('API', 'API error') {}

export class SystemError extends BaseError.extend('SYSTEM', 'System error') {}

export class InternalError extends BaseError.extend('INTERNAL', 'Internal error') {}

export class TimeoutError extends BaseError.extend('TIMEOUT', 'Timeout') {}

export class AbortedError extends BaseError.extend('ABORTED', 'Aborted') {}

export class NotImplementedError extends BaseError.extend('NOT_IMPLEMENTED', 'Not implemented') {}

export class RuntimeServiceError extends BaseError.extend('RUNTIME_SERVICE_ERROR', 'Runtime service error') {}
