//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, companionSegment } from '@dxos/app-toolkit';
import { Script } from '@dxos/functions';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space/meta';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}.space-settings-automation`,
        match: NodeMatcher.whenNodeType(`${spaceMeta.id}.settings`),
        connector: (node) =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: `${meta.id}.automations`,
              type: `${meta.id}.space-settings-automation`,
              label: ['automation-panel.label', { ns: meta.id }],
              icon: 'ph--lightning--regular',
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}.space-settings-functions`,
        match: NodeMatcher.whenNodeType(`${spaceMeta.id}.settings`),
        connector: (node) =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: `${meta.id}.functions`,
              type: `${meta.id}.space-settings-functions`,
              label: ['functions-panel.label', { ns: meta.id }],
              icon: 'ph--function--regular',
            }),
          ]),
      }),
      GraphBuilder.createTypeExtension({
        id: `${meta.id}.script-companion`,
        type: Script.Script,
        connector: (script) =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: companionSegment('automation'),
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
