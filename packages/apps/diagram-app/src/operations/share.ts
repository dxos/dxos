//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

/** Composer's members panel creates invitations through this operation. */
const handler: Operation.WithHandler<typeof SpaceOperation.Share> = SpaceOperation.Share.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, type, authMethod, multiUse, target }) {
      return space.share({ type, authMethod, multiUse, target });
    }),
  ),
);

export default handler;
