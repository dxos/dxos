// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

// TODO(wittjosiah): Implement object duplication without serializer.
const handler: Operation.WithHandler<typeof SpaceOperation.DuplicateObject> = SpaceOperation.DuplicateObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      return yield* Effect.fail(new Error('DuplicateObject is not yet implemented.'));
    }),
  ),
);
export default handler;
