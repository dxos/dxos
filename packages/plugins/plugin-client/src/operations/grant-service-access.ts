//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';

import { GrantServiceAccess } from './definitions';

/**
 * Writes a self-issued `ServiceAccess` credential admitting this identity to an EDGE/Hub service.
 * An operation rather than a direct service call so a component can grant access without holding
 * the client's credential-write surface.
 */
const handler: Operation.WithHandler<typeof GrantServiceAccess> = GrantServiceAccess.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ serverName, capabilities }) {
      yield* Identity.grantServiceAccess({ serverName, capabilities });
    }),
  ),
);

export default handler;
