//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { SETTINGS_SECTION_TYPE } from '@dxos/plugin-space';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Position } from '@dxos/util';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'spaceSettingsAutomation',
        match: NodeMatcher.whenNodeType(SETTINGS_SECTION_TYPE),
        connector: () =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'automations',
              type: `${meta.profile.key}.space-settings-automation`,
              label: ['automation-panel.label', { ns: meta.profile.key }],
              icon: 'ph--lightning--regular',
              iconHue: 'indigo',
              position: Position.last,
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'automationCompanion',
        match: NodeMatcher.whenEchoObjectMatches,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('automation'),
              label: ['automation-companion.label', { ns: meta.profile.key }],
              icon: 'ph--lightning--regular',
              data: 'automation',
              position: Position.last,
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
