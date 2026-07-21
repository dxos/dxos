//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Space invitations authenticate against a local HALO identity; there is nothing to redeem without one. */
export class NoIdentityError extends BaseError.extend(
  'NoIdentityError',
  'A local identity is required to accept a space invitation.',
) {}

/** The space's properties object never became available, so it cannot be safely used yet. */
export class SpaceNotReadyError extends BaseError.extend(
  'SpaceNotReadyError',
  'Timed out waiting for the space to finish initializing.',
) {}
