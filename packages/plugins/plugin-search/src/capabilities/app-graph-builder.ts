//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { ClientCapabilities } from '@dxos/plugin-client';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { SearchOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Reactive read: the connector may evaluate before the client module finishes
    // activating; the atom dependency re-evaluates it when the client lands.
    const clientAtom = yield* Capability.atom(ClientCapabilities.Client);
    // Layout is optional: in standalone harnesses (Storybook, tests) no plugin contributes
    // `AppCapabilities.Layout`; hoisting the atom lets the connector heal reactively if it lands.
    const layoutCapabilityAtom = yield* Capability.atom(AppCapabilities.Layout);
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'spaceSearch',
        match: NodeMatcher.whenRoot,
        connector: (node, get) =>
          Effect.gen(function* () {
            const [client] = get(clientAtom);
            if (!client) {
              return [];
            }
            const [layoutAtom] = get(layoutCapabilityAtom);
            const layout = layoutAtom ? get(layoutAtom) : undefined;
            const spaceId = layout?.workspace ? Paths.getSpaceIdFromPath(layout.workspace) : undefined;
            const space = spaceId ? client.spaces.get(spaceId) : null;

            return [
              AppNode.makeDeckCompanion({
                id: linkedSegment('search'),
                label: ['search.label', { ns: meta.profile.key }],
                icon: 'ph--magnifying-glass--regular',
                data: space,
              }),
            ];
          }).pipe(Effect.orDie),
      }),
      GraphBuilder.createExtension({
        id: 'root',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: SearchOperation.OpenSearch.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(SearchOperation.OpenSearch);
                return false;
              }),
              properties: {
                label: ['search-action.label', { ns: meta.profile.key }],
                icon: 'ph--magnifying-glass--regular',
                keyBinding: {
                  macos: 'shift+meta+f',
                  windows: 'shift+alt+f',
                },
              },
            },
          ]),
      }),
    ]);

    return Capability.provide(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
