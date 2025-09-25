//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class QueryError extends BaseError.extend('QUERY_ERROR') {}

export class InvalidQueryError extends QueryError.extend('INVALID_QUERY') {}
