//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { COMMANDS_DIALOG, meta } from '../../meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: meta.id,
      match: NodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          {
            id: COMMANDS_DIALOG,
            data: () =>
              Operation.invoke(Common.LayoutOperation.UpdateDialog, {
                subject: COMMANDS_DIALOG,
                blockAlign: 'start',
              }),
            properties: {
              label: ['open commands label', { ns: meta.id }],
              icon: 'ph--magnifying-glass--regular',
              keyBinding: {
                macos: 'meta+k',
                windows: 'ctrl+k',
              },
            },
          },
        ]),
    });

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
