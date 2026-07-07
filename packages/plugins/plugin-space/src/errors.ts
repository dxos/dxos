//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Space invitations authenticate against a local HALO identity; there is nothing to redeem without one. */
export class NoIdentityError extends BaseError.extend(
  'NoIdentityError',
  'A local identity is required to accept a space invitation.',
) {}
