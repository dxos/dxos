//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';
import * as DeckOperation from '@dxos/plugin-deck/DeckOperation';

import { PresenterOperation } from '#types';

import { getPresentationPath } from '../paths.ts';

/**
 * Enters or exits presentation for the given object. Entering fullscreens the presenter companion;
 * exiting reverts fullscreen and re-opens the source object.
 */
const handler: Operation.WithHandler<typeof PresenterOperation.SetPresenting> = PresenterOperation.SetPresenting.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object, state }) {
      const db = Obj.getDatabase(object);
      if (!db) {
        return;
      }

      const objectPath = GraphPath.getObjectPathFromObject(object);
      const presenterId = getPresentationPath(objectPath);
      const ephemeral = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
      const presenting = ephemeral.fullscreen === presenterId;
      const next = state;

      if (next) {
        if (!presenting) {
          // Toggles ephemeral fullscreen from undefined to `presenterId`.
          yield* Operation.invoke(DeckOperation.Adjust, { type: 'fullscreen' as const, id: presenterId });
        }
        yield* Operation.invoke(LayoutOperation.Open, {
          subject: [presenterId],
          workspace: GraphPath.getSpacePath(db.spaceId),
        });
      } else {
        if (presenting) {
          // Toggles ephemeral fullscreen back to undefined; `id` must match the currently-fullscreen
          // plank for the toggle in `adjust.ts` to clear it rather than switching it.
          yield* Operation.invoke(DeckOperation.Adjust, { type: 'fullscreen' as const, id: presenterId });
        }
        yield* Operation.invoke(LayoutOperation.Open, {
          subject: [objectPath],
          workspace: GraphPath.getSpacePath(db.spaceId),
        });
      }
    }),
  ),
);

export default handler;
