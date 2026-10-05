//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';

import * as ClientOperation from '../types/ClientOperation.ts';

const handler: Operation.WithHandler<typeof ClientOperation.UpdateProfile> = ClientOperation.UpdateProfile.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (profile) {
      yield* Identity.updateProfile({ displayName: profile.displayName, data: profile.data });
    }),
  ),
);

export default handler;
