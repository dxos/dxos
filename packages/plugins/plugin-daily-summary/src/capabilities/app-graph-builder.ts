//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { GraphBuilder, type Node } from '@dxos/plugin-graph';
import { SPACE_TYPE } from '@dxos/plugin-space/types';

import { meta } from '#meta';

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'space-settings-daily-summary',
        match: whenSpace,
        connector: () =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'daily-summary',
              type: `${meta.id}.space-settings-daily-summary`,
              label: ['plugin.name', { ns: meta.id }],
              icon: 'ph--calendar-check--regular',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
