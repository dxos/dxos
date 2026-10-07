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
import { Attention } from '@dxos/react-ui-attention/types';

import { PresenterOperation } from '#types';

import { getPresentationPath, isPresenting } from '../paths.ts';

/** The open plank showing the object, if any; its companions are the ones the graph has resolved. */
const findPlank = Effect.fnUntraced(function* (object: Obj.Unknown) {
  const { active } = yield* DeckCapabilities.getDeck();
  return active.find((id) => Attention.getSegmentId(id) === object.id);
});

/**
 * Enters or exits presentation for the given object by toggling the deck's fullscreen overlay onto the
 * presenter companion of the object's plank, opening the object first when no plank shows it. The
 * overlay is independent of what is open, so presenting leaves the URL alone.
 */
const handler: Operation.WithHandler<typeof PresenterOperation.SetPresenting> = PresenterOperation.SetPresenting.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object, state }) {
      const ephemeral = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
      if (isPresenting(ephemeral, object) === state) {
        return;
      }

      // `Adjust` toggles, and only clears fullscreen when `id` matches the plank that holds it.
      if (!state) {
        if (ephemeral.fullscreen) {
          yield* Operation.invoke(DeckOperation.Adjust, { type: 'fullscreen' as const, id: ephemeral.fullscreen });
        }
        return;
      }

      let plank = yield* findPlank(object);
      const db = Obj.getDatabase(object);
      if (!plank && db) {
        yield* Operation.invoke(LayoutOperation.Open, {
          subject: [GraphPath.getObjectPathFromObject(object)],
          workspace: GraphPath.getSpacePath(db.spaceId),
        });
        plank = yield* findPlank(object);
      }
      if (plank) {
        yield* Operation.invoke(DeckOperation.Adjust, { type: 'fullscreen' as const, id: getPresentationPath(plank) });
      }
    }),
  ),
);

export default handler;
