//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { CrxOperation } from '#types';

import { toOrganization } from '../mapping.ts';

const handler: Operation.WithHandler<typeof CrxOperation.AddOrganizationFromSnapshot> =
  CrxOperation.AddOrganizationFromSnapshot.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ snapshot, target }) {
        const organization = toOrganization(snapshot);
        const { id } = yield* Operation.invoke(
          SpaceOperation.AddObject,
          { object: organization },
          { spaceId: target.spaceId },
        );
        return { id };
      }),
    ),
  );

export default handler;
