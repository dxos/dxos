//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as Operation from '@dxos/compute/Operation';
import { Collection, Obj } from '@dxos/echo';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { meta } from '#meta';
import { PresenterCapabilities, PresenterOperation } from '#types';

import { isPresenting } from '../paths';

/** Match nodes that can be presented (Collection or Document). */
const whenPresentable = (node: AppGraphNode.Node, get: Atom.AtomContext) =>
  Option.orElse(AppNodeMatcher.whenEchoType(Collection.Collection)(node, get), () =>
    AppNodeMatcher.whenEchoType(Markdown.Document)(node, get),
  );

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so the extension establishes a dependency and heals once this
    // capability lands (dependency modules contribute individually, not batched per wave).
    const settingsCapabilityAtom = yield* Capability.atom(PresenterCapabilities.Settings);

    const isPresentable = (object: Obj.Any, get: Atom.AtomContext) => {
      const [settingsAtom] = get(settingsCapabilityAtom);
      const settings = settingsAtom ? get(settingsAtom) : undefined;
      return settings?.presentCollections
        ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
        : Obj.instanceOf(Markdown.Document, object);
    };

    const extensions = yield* AppGraphBuilder.createExtension({
      id: 'root',
      // TODO(wittjosiah): This is a hack to work around presenter previously relying on "variant". Remove.
      match: whenPresentable,
      connector: (object, get) => {
        if (!isPresentable(object, get)) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          AppNode.makeCompanion({
            variant: 'presenter',
            label: 'Presenter',
            icon: 'ph--presentation--regular',
            data: { type: meta.profile.key, object },
          }),
        ]);
      },
      actions: (object, get) => {
        const db = Obj.getDatabase(object);
        if (!isPresentable(object, get) || !db) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          {
            id: PresenterOperation.SetPresenting.meta.key,
            // The menu item flips, so it reads the current state and states the one it wants.
            data: Effect.fnUntraced(function* () {
              const ephemeral = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
              yield* Operation.invoke(PresenterOperation.SetPresenting, {
                object,
                state: !isPresenting(ephemeral, object),
              });
            }),
            properties: {
              label: ['toggle-presentation.label', { ns: meta.profile.key }],
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
