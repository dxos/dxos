//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A fact id is already held with different content. */
export class ConflictError extends BaseError.extend(
  'ConflictError',
  'A fact id is already held with different content.',
) {}

/** The change would violate a `reject` constraint; nothing was applied. */
export class ConsistencyError extends BaseError.extend('ConsistencyError', 'The change violates a constraint.') {}

/** The push names causes deeper than the brain allows, so it is likely a feedback loop; nothing was applied. */
export class LoopError extends BaseError.extend('LoopError', 'The change exceeds the causal depth limit.') {}

/** No registration has that id. */
export class UnknownRegistrationError extends BaseError.extend(
  'UnknownRegistrationError',
  'No registration has that id.',
) {}
