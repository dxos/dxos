//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Error was thrown inside the compute node.
 */
export class ComputeNodeError extends BaseError.extend('COMPUTE_NODE_ERROR') {}

/**
 * Node inputs/outputs failed schema validation.
 */
export class ValueValidationError extends BaseError.extend('VALUE_VALIDATION_ERROR') {}
