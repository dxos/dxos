//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';

import { CrxOperation } from '#types';

import { toOrganization } from '../mapping';

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
