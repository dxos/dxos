//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SpaceOperation } from '#types';

import { DefaultSpaceDeletionError } from '../errors.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.Delete> = SpaceOperation.Delete.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      // Everything that falls back to the default space (quick entry, chat, preview, entity lookup)
      // would resolve to nothing, so the designation has to move before the space can go.
      const client = yield* Capability.get(ClientCapabilities.Client);
      if (space.id === AppSpace.getDefaultSpace(client)?.id) {
        return yield* Effect.fail(new DefaultSpaceDeletionError());
      }

      yield* Effect.promise(() => space.delete());
    }),
  ),
);
export default handler;
