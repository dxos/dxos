//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { type DXN } from '@dxos/keys';

export class SchemaNotFoundError extends BaseError.extend('SchemaNotFoundError', 'Schema not found') {
  constructor(schema: string, options?: BaseErrorOptions) {
    super({ context: { schema }, ...options });
  }
}

export class ObjectNotFoundError extends BaseError.extend('ObjectNotFoundError', 'Object not found') {
  constructor(dxn: DXN, options?: BaseErrorOptions) {
    super({ context: { dxn }, ...options });
  }
}
