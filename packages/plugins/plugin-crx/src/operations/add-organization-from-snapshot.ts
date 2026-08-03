//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { SpaceOperation } from '@dxos/plugin-space';

import { toOrganization } from '../mapping';
import * as CrxOperation from '../types/CrxOperation';

const handler: Operation.WithHandler<typeof CrxOperation.AddOrganizationFromSnapshot> =
  CrxOperation.AddOrganizationFromSnapshot.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ snapshot, target }) {
        const organization = toOrganization(snapshot);
        const { id } = yield* Operation.invoke(SpaceOperation.AddObject, { object: organization, target });
        return { id };
      }),
    ),
  );

export default handler;
