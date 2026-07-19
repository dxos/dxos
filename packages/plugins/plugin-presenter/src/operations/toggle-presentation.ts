//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { DeckCapabilities, DeckOperation } from '@dxos/plugin-deck';

import { PresenterOperation } from '#types';

import { getPresentationPath } from '../paths';

/**
 * Enters or exits presentation for the given object. When `state` is omitted the
 * current presentation state is toggled. Entering fullscreens the presenter companion;
 * exiting reverts fullscreen and re-opens the source object.
 */
const handler: Operation.WithHandler<typeof PresenterOperation.TogglePresentation> =
  PresenterOperation.TogglePresentation.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ object, state }) {
        const db = Obj.getDatabase(object);
        if (!db) {
          return;
        }

        const objectPath = Paths.getObjectPathFromObject(object);
        const presenterId = getPresentationPath(objectPath);
        const ephemeral = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
        const presenting = ephemeral.fullscreen === presenterId;
        const next = state ?? !presenting;

        if (next) {
          if (!presenting) {
            // Toggles ephemeral fullscreen from undefined to `presenterId`.
            yield* Operation.invoke(DeckOperation.Adjust, { type: 'fullscreen' as const, id: presenterId });
          }
          yield* Operation.invoke(LayoutOperation.Open, {
            subject: [presenterId],
            workspace: Paths.getSpacePath(db.spaceId),
          });
        } else {
          if (presenting) {
            // Toggles ephemeral fullscreen back to undefined; `id` must match the currently-fullscreen
            // plank for the toggle in `adjust.ts` to clear it rather than switching it.
            yield* Operation.invoke(DeckOperation.Adjust, { type: 'fullscreen' as const, id: presenterId });
          }
          yield* Operation.invoke(LayoutOperation.Open, {
            subject: [objectPath],
            workspace: Paths.getSpacePath(db.spaceId),
          });
        }
      }),
    ),
  );

export default handler;
