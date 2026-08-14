//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';

import { GrantServiceAccess } from './definitions';

/** An operation so a component can grant access without holding a credential-write surface. */
const handler: Operation.WithHandler<typeof GrantServiceAccess> = GrantServiceAccess.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ serverName, capabilities }) {
      yield* Identity.grantServiceAccess({ serverName, capabilities });
    }),
  ),
);

export default handler;
