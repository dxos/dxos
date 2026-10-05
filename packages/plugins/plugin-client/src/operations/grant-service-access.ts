//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';

import * as ClientOperation from '../types/ClientOperation.ts';

/** An operation so a component can grant access without holding a credential-write surface. */
const handler: Operation.WithHandler<typeof ClientOperation.GrantServiceAccess> =
  ClientOperation.GrantServiceAccess.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ serverName, capabilities }) {
        yield* Identity.grantServiceAccess({ serverName, capabilities });
      }),
    ),
  );

export default handler;
