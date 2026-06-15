// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { SpaceOperation } from './definitions';

// TODO(wittjosiah): Implement object duplication without serializer.
const handler: Operation.WithHandler<typeof SpaceOperation.DuplicateObject> = SpaceOperation.DuplicateObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Effect.fail(new Error('DuplicateObject is not yet implemented.'));
    }),
  ),
);
export default handler;
