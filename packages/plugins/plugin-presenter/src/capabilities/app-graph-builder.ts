//
// Copyright 2025 DXOS.org
//

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
const whenPresentable = (node: Node.Node) =>
  Option.orElse(NodeMatcher.whenEchoType(Collection.Collection)(node), () =>
    NodeMatcher.whenEchoType(Markdown.Document)(node),
  );

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* GraphBuilder.createExtension({
      id: 'root',
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
        console.log('+++');

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
        const settingsAtom = capabilities.get(PresenterCapabilities.Settings);
        const settings = get(settingsAtom);
        const isPresentable = settings?.presentCollections
          ? Obj.instanceOf(Collection.Collection, object) || Obj.instanceOf(Markdown.Document, object)
          : Obj.instanceOf(Markdown.Document, object);
        const db = Obj.getDatabase(object);
        if (!isPresentable || !db) {
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

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
