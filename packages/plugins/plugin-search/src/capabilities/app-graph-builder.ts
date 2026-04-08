//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, getSpaceIdFromPath } from '@dxos/app-toolkit';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { SearchOperation } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}.space-search`,
        match: NodeMatcher.whenRoot,
        connector: Effect.fnUntraced(function* (node, get) {
          const client = yield* Capability.get(ClientCapabilities.Client);
          const layoutAtom = get(yield* Capability.atom(AppCapabilities.Layout))[0];
          const layout = layoutAtom ? get(layoutAtom) : undefined;
          const spaceId = layout?.workspace ? getSpaceIdFromPath(layout.workspace) : undefined;
          const space = spaceId ? client.spaces.get(spaceId) : null;

          return [
            AppNode.makeDeckCompanion({
              id: linkedSegment('search'),
              label: ['search.label', { ns: meta.id }],
              icon: 'ph--magnifying-glass--regular',
              data: space,
            }),
          ];
        }),
      }),
      GraphBuilder.createExtension({
        id: meta.id,
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
                label: ['search-action.label', { ns: meta.id }],
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

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
