//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  contributes,
  createIntent,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { Graph, GraphBuilder } from '@dxos/plugin-graph';

import { COMMANDS_DIALOG, meta } from '../meta';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    GraphBuilder.createExtension({
      id: meta.id,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === Graph.ROOT_ID ? Option.some(node) : Option.none())),
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
  ),
);
