//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder, type Node, NodeMatcher } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';

import { meta } from '../../meta';
import { PresenterCapabilities, PresenterOperation, type PresenterSettingsProps } from '../../types';

/** Match nodes that can be presented (Collection or Document). */
const whenPresentable = (node: Node.Node) =>
  Option.orElse(NodeMatcher.whenEchoType(Collection.Collection)(node), () =>
    NodeMatcher.whenEchoType(Markdown.Document)(node),
  );

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* GraphBuilder.createExtension({
      id: `${meta.id}/root`,
      // TODO(wittjosiah): This is a hack to work around presenter previously relying on "variant". Remove.
      match: whenPresentable,
      connector: (object, get) => {
        const registry = capabilities.get(Common.Capability.AtomRegistry);
        const settingsAtom = capabilities.get(PresenterCapabilities.Settings);
        const settings = registry.get(settingsAtom);
        const isPresentable = settings?.presentCollections
          ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
          : Obj.instanceOf(Markdown.Document, object);
        if (!isPresentable) {
          return Effect.succeed([]);
        }
        const id = Obj.getDXN(object).toString();
        return Effect.succeed([
          {
            id: [id, 'presenter'].join(ATTENDABLE_PATH_SEPARATOR),
            data: { type: meta.id, object },
            type: meta.id,
            properties: {
              label: 'Presenter',
              icon: 'ph--presentation--regular',
              disposition: 'hidden',
            },
          },
        ]);
      },
      actions: (object, get) => {
        const registry = capabilities.get(Common.Capability.AtomRegistry);
        const settingsAtom = capabilities.get(PresenterCapabilities.Settings);
        const settings = registry.get(settingsAtom);
        const isPresentable = settings?.presentCollections
          ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
          : Obj.instanceOf(Markdown.Document, object);
        if (!isPresentable) {
          return Effect.succeed([]);
        }
        const dxn = Obj.getDXN(object);
        const id = dxn.toString();
        const { spaceId } = dxn.asEchoDXN()!;
        return Effect.succeed([
          {
            id: `${PresenterOperation.TogglePresentation.meta.key}/${id}`,
            // TODO(burdon): Allow function so can generate state when activated.
            //  So can set explicit fullscreen state coordinated with current presenter state.
            data: Effect.fnUntraced(function* () {
              const deckStateStore = yield* Capability.get(DeckCapabilities.State);
              const presenterId = [id, 'presenter'].join(ATTENDABLE_PATH_SEPARATOR);
              if (!deckStateStore.state.deck.fullscreen) {
                yield* Operation.invoke(DeckOperation.Adjust, {
                  type: 'solo--fullscreen' as const,
                  id: presenterId,
                });
              }
              yield* Operation.invoke(Common.LayoutOperation.Open, {
                subject: [presenterId],
                workspace: spaceId,
              });
            }),
            properties: {
              label: ['toggle presentation label', { ns: meta.id }],
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

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
