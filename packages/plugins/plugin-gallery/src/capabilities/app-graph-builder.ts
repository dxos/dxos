//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Gallery } from '#types';

import { GALLERY_SHOW_SEGMENT } from '../paths';

const SHOW_ACTION_ID = `${meta.id}.action.show`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: meta.id,
      match: (node) => NodeMatcher.whenEchoType(Gallery.Gallery)(node),
      connector: (object) =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment(GALLERY_SHOW_SEGMENT),
            label: ['show.label', { ns: meta.id }],
            icon: 'ph--play--regular',
            data: { type: meta.id, object },
          }),
        ]),
      actions: (object) => {
        const db = Obj.getDatabase(object);
        if (!db) {
          return Effect.succeed([]);
        }
        const objectPath = getObjectPathFromObject(object);
        return Effect.succeed([
          {
            id: SHOW_ACTION_ID,
            data: Effect.fnUntraced(function* () {
              const deckState = yield* Capabilities.getAtomValue(DeckCapabilities.State);
              const deck = deckState.decks[deckState.activeDeck];
              const showId = `${objectPath}/${linkedSegment(GALLERY_SHOW_SEGMENT)}`;
              if (!deck?.fullscreen) {
                yield* Operation.invoke(DeckOperation.Adjust, {
                  type: 'solo--fullscreen' as const,
                  id: showId,
                });
              }
              yield* Operation.invoke(LayoutOperation.Open, {
                subject: [showId],
                workspace: getSpacePath(db.spaceId),
              });
            }),
            properties: {
              label: ['show.label', { ns: meta.id }],
              icon: 'ph--play--regular',
              disposition: 'list-item',
            },
          },
        ]);
      },
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
