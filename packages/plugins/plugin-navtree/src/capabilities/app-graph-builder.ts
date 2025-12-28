//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  Capability,
  LayoutAction,
  createIntent,
} from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { COMMANDS_DIALOG, meta } from '../meta';

export default Capability.makeModule((context) =>
  Capability.contributes(
    Capabilities.AppGraphBuilder,
    GraphBuilder.createExtension({
      id: meta.id,
      match: NodeMatcher.whenRoot,
      actions: () => [
        {
          id: COMMANDS_DIALOG,
          data: async () => {
            const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
            await dispatch(
              createIntent(LayoutAction.UpdateDialog, {
                part: 'dialog',
                subject: COMMANDS_DIALOG,
                options: {
                  blockAlign: 'start',
                },
              }),
            );
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
);
