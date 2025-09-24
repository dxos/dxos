//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Error was thrown inside the compute node.
 */
export class ComputeNodeError extends BaseError.extend('COMPUTE_NODE_ERROR', 'Compute node error') {}

/**
 * Node inputs/outputs failed schema validation.
 */
// TODO(burdon): Move to @dxos/errors (InvalidValueError)
export class InvalidValueError extends BaseError.extend('VALUE_VALIDATION_ERROR', 'Value validation error') {}
