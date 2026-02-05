//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { meta as debugMeta } from '@dxos/plugin-debug';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { themeEditorId } from '../../defs';
import { meta } from '../../meta';

const DEVTOOLS_TYPE = `${debugMeta.id}/devtools`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: themeEditorId,
        match: NodeMatcher.whenNodeType(DEVTOOLS_TYPE),
        connector: (node) =>
          Effect.succeed([
            {
              id: `${themeEditorId}-${node.id}`,
              type: themeEditorId,
              data: themeEditorId,
              properties: {
                label: ['theme editor label', { ns: meta.id }],
                icon: 'ph--palette--regular',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
