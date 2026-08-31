// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.Share> = SpaceOperation.Share.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { space, type, authMethod, multiUse, target } = input;
      const invitation = space.share({ type, authMethod, multiUse, target });

      return invitation;
    }),
  ),
);
export default handler;
