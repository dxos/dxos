//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { parseId } from '@dxos/react-client/echo';

import { meta } from '../../meta';
import { SearchOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}/space-search`,
        match: NodeMatcher.whenRoot,
        connector: Effect.fnUntraced(function* (node, get) {
          const client = yield* Capability.get(ClientCapabilities.Client);
          const layoutAtom = get(yield* Capability.atom(Common.Capability.Layout))[0];
          const layout = layoutAtom ? get(layoutAtom) : undefined;
          const { spaceId } = parseId(layout?.workspace);
          const space = spaceId ? client.spaces.get(spaceId) : null;

          return [
            {
              id: [node.id, 'search'].join(ATTENDABLE_PATH_SEPARATOR),
              type: DECK_COMPANION_TYPE,
              data: space,
              properties: {
                label: ['search label', { ns: meta.id }],
                icon: 'ph--magnifying-glass--regular',
                disposition: 'hidden',
              },
            },
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
                label: ['search action label', { ns: meta.id }],
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

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
