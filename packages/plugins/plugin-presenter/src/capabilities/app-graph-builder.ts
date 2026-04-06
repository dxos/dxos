//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  LayoutOperation,
  companionId,
  companionSegment,
  getObjectPathFromObject,
  getSpacePath,
} from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { GraphBuilder, type Node, NodeMatcher } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';

import { meta } from '../meta';
import { PresenterCapabilities } from '#types';
import { PresenterOperation } from '#operations';

/** Match nodes that can be presented (Collection or Document). */
const whenPresentable = (node: Node.Node) =>
  Option.orElse(NodeMatcher.whenEchoType(Collection.Collection)(node), () =>
    NodeMatcher.whenEchoType(Markdown.Document)(node),
  );

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* GraphBuilder.createExtension({
      id: `${meta.id}.root`,
      // TODO(wittjosiah): This is a hack to work around presenter previously relying on "variant". Remove.
      match: whenPresentable,
      connector: (object, get) => {
        const settingsAtom = capabilities.get(PresenterCapabilities.Settings);
        const settings = get(settingsAtom);
        const isPresentable = settings?.presentCollections
          ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
          : Obj.instanceOf(Markdown.Document, object);
        if (!isPresentable) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          {
            id: companionSegment('presenter'),
            data: { type: meta.id, object },
            type: PLANK_COMPANION_TYPE,
            properties: {
              label: 'Presenter',
              icon: 'ph--presentation--regular',
              disposition: 'hidden',
            },
          },
        ]);
      },
      actions: (object, get) => {
        const settingsAtom = capabilities.get(PresenterCapabilities.Settings);
        const settings = get(settingsAtom);
        const isPresentable = settings?.presentCollections
          ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
          : Obj.instanceOf(Markdown.Document, object);
        const db = Obj.getDatabase(object);
        if (!isPresentable || !db) {
          return Effect.succeed([]);
        }
        const objectPath = getObjectPathFromObject(object);

        return Effect.succeed([
          {
            id: PresenterOperation.TogglePresentation.meta.key,
            // TODO(burdon): Allow function so can generate state when activated.
            //  So can set explicit fullscreen state coordinated with current presenter state.
            data: Effect.fnUntraced(function* () {
              const deckState = yield* Capabilities.getAtomValue(DeckCapabilities.State);
              const deck = deckState.decks[deckState.activeDeck];
              const presenterId = companionId(objectPath, 'presenter');
              if (!deck?.fullscreen) {
                yield* Operation.invoke(DeckOperation.Adjust, {
                  type: 'solo--fullscreen' as const,
                  id: presenterId,
                });
              }
              yield* Operation.invoke(LayoutOperation.Open, {
                subject: [presenterId],
                workspace: getSpacePath(db.spaceId),
              });
            }),
            properties: {
              label: ['toggle-presentation.label', { ns: meta.id }],
              icon: 'ph--presentation--regular',
              disposition: 'list-item',
              keyBinding: {
                macos: 'shift+meta+p',
                windows: 'shift+alt+p',
              },
            },
          },
        ]);
      },
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
