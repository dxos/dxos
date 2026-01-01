//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { parseId } from '@dxos/react-client/echo';

import { meta } from '../../meta';
import { SearchAction, SearchOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.AppGraphBuilder, [
      GraphBuilder.createExtension({
        id: `${meta.id}/space-search`,
        match: NodeMatcher.whenRoot,
        connector: (node, get) => {
          const workspace = get(CreateAtom.fromSignal(() => context.getCapability(Common.Capability.Layout).workspace));
          const client = context.getCapability(ClientCapabilities.Client);
          const { spaceId } = parseId(workspace);
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
        },
      }),
      GraphBuilder.createExtension({
        id: meta.id,
        match: NodeMatcher.whenRoot,
        actions: () => [
          {
            id: SearchAction.OpenSearch._tag,
            data: async () => {
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              await invokePromise(SearchOperation.OpenSearch);
              return false;
            },
            properties: {
              label: ['search action label', { ns: meta.id }],
              icon: 'ph--magnifying-glass--regular',
              keyBinding: {
                macos: 'shift+meta+f',
                windows: 'shift+alt+f',
              },
            },
          },
        ],
      }),
    ]),
  ),
);
