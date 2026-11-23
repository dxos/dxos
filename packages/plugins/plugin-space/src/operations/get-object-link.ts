//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SpaceOperation } from '#types';

import { SpaceOperationError } from './errors.ts';
import { SpaceOperationConfig } from './helpers.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.GetObjectLink> = SpaceOperation.GetObjectLink.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object: ref }) {
      const object = yield* Database.load(ref);
      const { createObjectUrl } = yield* Capability.get(SpaceOperationConfig);
      if (!createObjectUrl) {
        return yield* Effect.fail(new SpaceOperationError({ message: 'This host has no public origin to link to.' }));
      }
      const url = createObjectUrl(object);
      if (!url) {
        return yield* Effect.fail(new SpaceOperationError({ message: `Not an object in a space: ${ref.uri}` }));
      }
      return { url };
    }),
  ),
);

export default handler;
