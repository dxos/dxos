//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { COMMANDS_DIALOG, meta } from '../../meta';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.AppGraphBuilder,
      GraphBuilder.createExtension({
        id: meta.id,
        match: NodeMatcher.whenRoot,
        actions: () => [
          {
            id: COMMANDS_DIALOG,
            data: async () => {
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              await invokePromise(Common.LayoutOperation.UpdateDialog, {
                subject: COMMANDS_DIALOG,
                blockAlign: 'start',
              });
            },
            properties: {
              label: ['open commands label', { ns: meta.id }],
              icon: 'ph--magnifying-glass--regular',
              keyBinding: {
                macos: 'meta+k',
                windows: 'ctrl+k',
              },
            },
          },
        ],
      }),
    ),
  ),
);
