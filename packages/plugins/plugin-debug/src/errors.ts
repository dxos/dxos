//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** The requested template id matches nothing contributed; the operation's listing names the valid ids. */
export class SpaceTemplateNotFoundError extends BaseError.extend(
  'SpaceTemplateNotFoundError',
  'No space template is registered under that id.',
) {}

/** The requested space id resolves to no space on this client. */
export class SpaceNotFoundError extends BaseError.extend('SpaceNotFoundError', 'No space with that id.') {}

/** Applying a template failed part-way; the cause carries what the phase actually threw. */
export class SpaceTemplateApplyError extends BaseError.extend(
  'SpaceTemplateApplyError',
  'Failed to apply the space template.',
) {}

/** The history tracker has no undoable operation to revert. */
export class NothingToUndoError extends BaseError.extend('NothingToUndoError', 'Nothing to undo.') {}
