//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A requested child grant asks for more than its parent grants cover. */
export class AttenuationError extends BaseError.extend(
  'AttenuationError',
  'Requested grant is not covered by the parent grants',
) {}

/** A requirement had no satisfying grant chain for the principal. */
export class PermissionDeniedError extends BaseError.extend('PermissionDeniedError', 'Permission denied') {}

/** A consentable requirement is unmet and the caller may ask the user. */
export class ConsentRequiredError extends BaseError.extend('ConsentRequiredError', 'Consent required') {}

/** A subject selector did not resolve to a URI in the operation's arguments. */
export class SubjectResolutionError extends BaseError.extend(
  'SubjectResolutionError',
  'Subject could not be resolved from the arguments',
) {}
