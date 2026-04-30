//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { Script } from '@dxos/functions';
import { GraphBuilder, type Node } from '@dxos/plugin-graph';
import { SPACE_TYPE } from '@dxos/plugin-space/types';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Automations + Functions entries attach directly under each Space
      // (formerly under the alternate-tree settings panel). `fallback`
      // sinks them to the bottom of the Space's children alongside Database
      // and Devtools, away from the user's day-to-day content.
      GraphBuilder.createExtension({
        id: 'space-settings-automation',
        match: whenSpace,
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
        match: whenSpace,
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
