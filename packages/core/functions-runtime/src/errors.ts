//
// Copyright 2025 DXOS.org
//

import { type Message } from 'esbuild';

import { BaseError } from '@dxos/errors';

export class FunctionServiceError extends BaseError.extend('FUNCTION_SERVICE_ERROR') {}

export class BundleCreationError extends BaseError.extend('BUNDLE_CREATION_ERROR', 'Bundle creation failed') {
  constructor(errors: Message[]) {
    super({ context: { errors } });
  }
}
