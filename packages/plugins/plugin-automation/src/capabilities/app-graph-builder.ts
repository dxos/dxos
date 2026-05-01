//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher } from '@dxos/app-toolkit';
import { Script } from '@dxos/functions';
import { GraphBuilder } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'space-settings-automation',
        match: AppNodeMatcher.whenSpace,
        connector: () =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'automations',
              type: `${meta.id}.space-settings-automation`,
              label: ['automation-panel.label', { ns: meta.id }],
              icon: 'ph--lightning--regular',
              position: 'fallback',
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'space-settings-functions',
        match: AppNodeMatcher.whenSpace,
        connector: () =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'functions',
              type: `${meta.id}.space-settings-functions`,
              label: ['functions-panel.label', { ns: meta.id }],
              icon: 'ph--function--regular',
              position: 'fallback',
            }),
          ]),
      }),
      GraphBuilder.createTypeExtension({
        id: 'script-companion',
        type: Script.Script,
        connector: (script) =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('automation'),
              label: ['script-automation.label', { ns: meta.id }],
              icon: 'ph--lightning--regular',
              data: 'automation',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
