//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as Operation from '@dxos/compute/Operation';
import { Obj, View } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { meta } from '#meta';
import { Map, MapCapabilities, MapOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Hoisted so the connector below reads it reactively via `get` instead of a sync
    // `Capability.getAll` snapshot, which would never heal once the capability lands.
    const markerProvidersAtom = yield* Capability.atom(MapCapabilities.MarkerProvider);

    const extensions = yield* AppGraphBuilder.createExtension({
      id: MapOperation.SetControlType.meta.key,
      match: (node, get) => Option.map(AppNodeMatcher.whenEchoType(View.View)(node, get), (view) => ({ view, node })),
      actions: ({ view, node }, get) => {
        const presentationRef = (node.properties as any).presentation;
        const target = presentationRef ? get(Obj.atom(presentationRef)) : undefined;
        if (!Obj.instanceOf(Map.Map, target)) {
          return Effect.succeed([]);
        }
        return Effect.succeed([
          AppGraphNode.makeAction({
            id: `${view.id}.toggle-map`,
            // The menu item flips, so it reads the current view and states the one it wants.
            data: () =>
              Effect.gen(function* () {
                const state = yield* Capabilities.getAtomValue(MapCapabilities.State);
                const type = state.type === 'globe' ? ('map' as const) : ('globe' as const);
                yield* Operation.invoke(MapOperation.SetControlType, { type });
              }),
            properties: {
              label: ['toggle-type.label', { ns: meta.profile.key }],
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
    const whenPlottable = GraphNodeMatcher.whenAll(
      AppNodeMatcher.whenEchoObject,
      GraphNodeMatcher.whenNot(AppNodeMatcher.whenEchoTypeMatches(Map.Map)),
    );

    const companion = yield* AppGraphBuilder.createExtension({
      id: 'mapCompanion',
      match: whenPlottable,
      connector: (object, get) =>
        Effect.gen(function* () {
          const providers = get(markerProvidersAtom);
          if (!providers.some((provider) => provider.match(object))) {
            return [];
          }
          return [
            AppNode.makeCompanion({
              variant: 'map',
              label: ['map.companion.label', { ns: meta.profile.key }],
              icon: 'ph--map-trifold--regular',
              data: 'map',
            }),
          ];
        }),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [extensions, companion]);
  }),
);
