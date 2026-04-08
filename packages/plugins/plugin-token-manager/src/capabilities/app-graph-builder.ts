//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space/meta';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}.space-settings`,
        match: NodeMatcher.whenNodeType(`${spaceMeta.id}.settings`),
        connector: (node) =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: `${meta.id}.integrations`,
              type: `${meta.id}.space-settings`,
              label: ['space-panel.name', { ns: meta.id }],
              icon: 'ph--plugs--regular',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
