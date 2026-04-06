//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, companionSegment } from '@dxos/app-toolkit';
import { Script } from '@dxos/functions';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
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
            {
              id: `${meta.id}.automations`,
              type: `${meta.id}.space-settings-automation`,
              data: `${meta.id}.space-settings-automation`,
              properties: {
                label: ['automation-panel.label', { ns: meta.id }],
                icon: 'ph--lightning--regular',
              },
            },
          ]),
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}.space-settings-functions`,
        match: NodeMatcher.whenNodeType(`${spaceMeta.id}.settings`),
        connector: (node) =>
          Effect.succeed([
            {
              id: `${meta.id}.functions`,
              type: `${meta.id}.space-settings-functions`,
              data: `${meta.id}.space-settings-functions`,
              properties: {
                label: ['functions-panel.label', { ns: meta.id }],
                icon: 'ph--function--regular',
              },
            },
          ]),
      }),
      GraphBuilder.createTypeExtension({
        id: `${meta.id}.script-companion`,
        type: Script.Script,
        connector: (script) =>
          Effect.succeed([
            {
              id: companionSegment('automation'),
              type: PLANK_COMPANION_TYPE,
              data: 'automation',
              properties: {
                label: ['script-automation.label', { ns: meta.id }],
                icon: 'ph--lightning--regular',
                disposition: 'hidden',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
