//
// Copyright 2025 DXOS.org
//

import { BaseError } from './base';

export class TimeoutError extends BaseError.extend('TIMEOUT') {}

export class AbortedError extends BaseError.extend('ABORTED') {}

export class UnimplementedError extends BaseError.extend('UNIMPLEMENTED') {}

export class ApiError extends BaseError.extend('API_ERROR') {}

export class SystemError extends BaseError.extend('SYSTEM_ERROR') {}

export class InternalError extends BaseError.extend('INTERNAL_ERROR') {}
