//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Space invitations authenticate against a local HALO identity; there is nothing to redeem without one. */
export class NoIdentityError extends BaseError.extend(
  'NoIdentityError',
  'A local identity is required to accept a space invitation.',
) {}

/** Deleting the designated default space would strand content that resolves to it. */
export class DefaultSpaceDeletionError extends BaseError.extend(
  'DefaultSpaceDeletionError',
  'The default space cannot be deleted; designate another space first.',
) {}

/** The space's properties object never became available, so it cannot be safely used yet. */
export class SpaceNotReadyError extends BaseError.extend(
  'SpaceNotReadyError',
  'Timed out waiting for the space to finish initializing.',
) {}

/** A create names a template whose capability is not contributed — usually deactivated while the dialog stayed open. */
export class TemplateNotFoundError extends BaseError.extend(
  'TemplateNotFoundError',
  'No space template is registered under that id.',
) {}

/** The space was created and initialized, but the template failed to write its content into it. */
export class TemplateApplyError extends BaseError.extend('TemplateApplyError', 'Failed to apply the space template.') {}
