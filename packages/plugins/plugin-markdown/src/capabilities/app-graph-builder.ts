//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { Markdown } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // History companion tab: checkpoints, branches, and time travel for every document.
      GraphBuilder.createTypeExtension({
        id: 'documentHistoryCompanion',
        type: Markdown.Document,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'history',
              label: ['history-panel.title', { ns: meta.profile.key }],
              icon: 'ph--git-branch--regular',
              data: 'history',
            }),
          ]),
      }),
    ]);

    return [Capability.provide(AppCapabilities.AppGraphBuilder, extensions)];
  }),
);
