//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, NOT_FOUND_NODE_ID, NOT_FOUND_NODE_TYPE } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: 'org.dxos.plugin.simple-layout.not-found',
      match: NodeMatcher.whenRoot,
      connector: () =>
        Effect.succeed([
          {
            id: NOT_FOUND_NODE_ID,
            type: NOT_FOUND_NODE_TYPE,
            data: null,
            properties: {
              label: ['not found heading', { ns: 'org.dxos.i18n.os' }],
              icon: 'ph--warning--regular',
              disposition: 'hidden',
            },
          },
        ]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
