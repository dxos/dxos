//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { ROOT_ID, createExtension } from '@dxos/plugin-graph';

import { COMMANDS_DIALOG, meta } from '../meta';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: meta.id,
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
                  label: ['open commands label', { ns: meta.id }],
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
