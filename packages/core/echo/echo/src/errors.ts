//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { type DXN } from '@dxos/keys';

export class SchemaNotFoundError extends BaseError.extend('SCHEMA_NOT_FOUND', 'Schema not found') {
  constructor(schema: string, options?: BaseErrorOptions) {
    super({ context: { schema }, ...options });
  }
}

export class ObjectNotFoundError extends BaseError.extend('OBJECT_NOT_FOUND', 'Object not found') {
  constructor(dxn: DXN, options?: BaseErrorOptions) {
    super({ context: { dxn }, ...options });
  }
}

export class NoResultsError extends BaseError.extend('NO_RESULTS', 'No results') {
  constructor(options?: BaseErrorOptions) {
    super({ ...options });
  }
}
