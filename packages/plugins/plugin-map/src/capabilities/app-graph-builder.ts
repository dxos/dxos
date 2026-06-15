//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, View } from '@dxos/echo';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { MapOperation } from '#types';
import { Map, MapCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: MapOperation.Toggle.meta.key,
      match: (node) => Option.map(NodeMatcher.whenEchoType(View.View)(node), (view) => ({ view, node })),
      actions: ({ view, node }, get) => {
        const presentationRef = (node.properties as any).presentation;
        const target = presentationRef ? get(Obj.atom(presentationRef)) : undefined;
        if (!Obj.instanceOf(Map.Map, target)) {
          return Effect.succeed([]);
        }
        return Effect.succeed([
          Node.makeAction({
            id: `${view.id}.toggle-map`,
            data: () => Operation.invoke(MapOperation.Toggle, undefined),
            properties: {
              label: ['toggle-type.label', { ns: meta.id }],
              icon: 'ph--compass--regular',
            },
          }),
        ]);
      },
    });

    // Map companion: offered on any object a MarkerProvider can plot (excluding Map.Map itself,
    // whose primary article is already a map). Gating lives here (capability-aware) rather than in
    // the surface filter; refining it to require non-empty markers is a follow-up.
    // Any ECHO object that is not a Map.Map itself (whose primary article is already a map surface).
    const whenPlottable = NodeMatcher.whenAll(
      NodeMatcher.whenEchoObject,
      NodeMatcher.whenNot(NodeMatcher.whenEchoTypeMatches(Map.Map)),
    );

    const companion = yield* GraphBuilder.createExtension({
      id: 'mapCompanion',
      match: whenPlottable,
      connector: (object) =>
        Effect.gen(function* () {
          const providers = yield* Capability.getAll(MapCapabilities.MarkerProvider);
          if (!providers.some((provider) => provider.match(object))) {
            return [];
          }
          return [
            AppNode.makeCompanion({
              id: linkedSegment('map'),
              label: ['map.companion.label', { ns: meta.id }],
              icon: 'ph--map-trifold--regular',
              data: 'map',
            }),
          ];
        }),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, [extensions, companion]);
  }),
);
