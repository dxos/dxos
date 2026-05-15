// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { ClientCapabilities } from '@dxos/plugin-client';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.ImportSpace> = SpaceOperation.ImportSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ archive }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = yield* Effect.promise(() => client.spaces.import(archive));
      yield* Effect.promise(() => space.waitUntilReady());
      return { space };
    }),
  ),
);
export default handler;
