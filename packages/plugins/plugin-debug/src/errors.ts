//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** The requested sample space id matches nothing contributed; the operation's listing names the valid ids. */
export class SampleSpaceNotFoundError extends BaseError.extend(
  'SampleSpaceNotFoundError',
  'No sample space is registered under that id.',
) {}

/** The requested space id resolves to no space on this client. */
export class SpaceNotFoundError extends BaseError.extend('SpaceNotFoundError', 'No space with that id.') {}
