//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A schema field that cannot be asked as a TypeSafe question. */
export class DecisionSchemaError extends BaseError.extend('DecisionSchemaError', 'Schema is not a decision schema') {
  constructor(context: { readonly field: string; readonly reason: string }, options?: { readonly cause?: unknown }) {
    super({ context, cause: options?.cause });
  }
}

/** The System One call failed, or its answers did not match the schema that asked for them. */
export class DecisionError extends BaseError.extend('DecisionError', 'Decision request failed') {
  constructor(context: Record<string, unknown>, options?: { readonly cause?: unknown }) {
    super({ context, cause: options?.cause });
  }
}
