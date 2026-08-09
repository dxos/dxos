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

/** Applying the space's edge-replication preference failed; the space itself was still created. */
export class EdgeReplicationError extends BaseError.extend(
  'EdgeReplicationError',
  'Failed to apply the edge replication preference.',
) {}

/** The space's properties object never became available, so it cannot be safely used yet. */
export class SpaceNotReadyError extends BaseError.extend(
  'SpaceNotReadyError',
  'Timed out waiting for the space to finish initializing.',
) {}
