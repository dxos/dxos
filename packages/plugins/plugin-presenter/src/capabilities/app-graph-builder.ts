//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Collection, Obj } from '@dxos/echo';
import { GraphBuilder, type Node, NodeMatcher } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { PresenterOperation } from '#types';
import { PresenterCapabilities } from '#types';

/** Match nodes that can be presented (Collection or Document). */
const whenPresentable = (node: Node.Node, get: Atom.Context) =>
  Option.orElse(NodeMatcher.whenEchoType(Collection.Collection)(node, get), () =>
    NodeMatcher.whenEchoType(Markdown.Document)(node, get),
  );

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so the extension establishes a dependency and heals once this
    // capability lands (dependency modules contribute individually, not batched per wave).
    const settingsCapabilityAtom = yield* Capability.atom(PresenterCapabilities.Settings);

    const isPresentable = (object: Obj.Any, get: Atom.Context) => {
      const [settingsAtom] = get(settingsCapabilityAtom);
      const settings = settingsAtom ? get(settingsAtom) : undefined;
      return settings?.presentCollections
        ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
        : Obj.instanceOf(Markdown.Document, object);
    };

    const extensions = yield* GraphBuilder.createExtension({
      id: 'root',
      // TODO(wittjosiah): This is a hack to work around presenter previously relying on "variant". Remove.
      match: whenPresentable,
      connector: (object, get) => {
        if (!isPresentable(object, get)) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('presenter'),
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
            id: PresenterOperation.TogglePresentation.meta.key,
            data: Effect.fnUntraced(function* () {
              yield* Operation.invoke(PresenterOperation.TogglePresentation, { object });
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

    return [Capability.provide(AppCapabilities.AppGraphBuilder, extensions)];
  }),
);
