//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { DeckCapabilities, DeckOperation } from '@dxos/plugin-deck';
import { linkedSegment } from '@dxos/react-ui-attention';

import { PresenterOperation } from '#types';

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

        const objectPath = getObjectPathFromObject(object);
        const presenterId = `${objectPath}/${linkedSegment('presenter')}`;
        const deckState = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        const deck = deckState.decks[deckState.activeDeck];
        const presenting = Boolean(deck?.fullscreen && deck?.solo === presenterId);
        const next = state ?? !presenting;

        if (next) {
          if (!deck?.fullscreen) {
            yield* Operation.invoke(DeckOperation.Adjust, { type: 'solo--fullscreen' as const, id: presenterId });
          }
          yield* Operation.invoke(LayoutOperation.Open, {
            subject: [presenterId],
            workspace: getSpacePath(db.spaceId),
          });
        } else {
          if (deck?.fullscreen) {
            yield* Operation.invoke(DeckOperation.Adjust, { type: 'solo--fullscreen' as const, id: objectPath });
          }
          yield* Operation.invoke(LayoutOperation.Open, {
            subject: [objectPath],
            workspace: getSpacePath(db.spaceId),
          });
        }
      }),
    ),
  );

export default handler;
