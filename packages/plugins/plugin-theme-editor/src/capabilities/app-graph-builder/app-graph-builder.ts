//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { themeEditorId } from '../../defs';
import { meta } from '../../meta';

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    return Capability.contributes(Common.Capability.AppGraphBuilder, [
      GraphBuilder.createExtension({
        id: themeEditorId,
        match: NodeMatcher.whenRoot,
        connector: () => [
          {
            id: themeEditorId,
            type: themeEditorId,
            data: themeEditorId,
            properties: {
              label: ['theme editor label', { ns: meta.id }],
              disposition: 'navigation',
              icon: 'ph--palette--regular',
            },
          },
        ],
      }),
    ]);
  }),
);
