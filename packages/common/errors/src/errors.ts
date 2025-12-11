//
// Copyright 2025 DXOS.org
//

import { BaseError } from './base';

export class ApiError extends BaseError.extend('ApiError', 'API error') {}

export class SystemError extends BaseError.extend('SystemError', 'System error') {}

export class InternalError extends BaseError.extend('InternalError', 'Internal error') {}

export class TimeoutError extends BaseError.extend('TimeoutError', 'Timeout') {}

export class AbortedError extends BaseError.extend('AbortedError', 'Aborted') {}

export class NotImplementedError extends BaseError.extend('NotImplementedError', 'Not implemented') {}

export class RuntimeServiceError extends BaseError.extend('RuntimeServiceError', 'Runtime service error') {}
