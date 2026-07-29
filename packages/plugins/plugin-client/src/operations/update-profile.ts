//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Identity } from '@dxos/halo';

import { UpdateProfile } from './definitions';

const handler: Operation.WithHandler<typeof UpdateProfile> = UpdateProfile.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (profile) {
      yield* Identity.updateProfile({ displayName: profile.displayName, data: profile.data });
    }),
  ),
);

export default handler;
