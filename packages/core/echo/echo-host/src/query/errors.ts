//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class QueryError extends BaseError.extend('QueryError') {}

export class InvalidQueryError extends QueryError.extend('InvalidQueryError') {}
