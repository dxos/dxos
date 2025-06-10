//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, type PluginContext, createIntent, LayoutAction } from '@dxos/app-framework';
import { createExtension, ROOT_ID } from '@dxos/plugin-graph';

import { COMMANDS_DIALOG, NAVTREE_PLUGIN } from '../meta';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: NAVTREE_PLUGIN,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
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
                  label: ['open commands label', { ns: NAVTREE_PLUGIN }],
                  icon: 'ph--magnifying-glass--regular',
                  keyBinding: {
                    macos: 'meta+k',
                    windows: 'ctrl+k',
                  },
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  );
