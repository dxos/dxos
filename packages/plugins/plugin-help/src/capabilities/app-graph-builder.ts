//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  contributes,
  createIntent,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/app-graph';

import { SHORTCUTS_DIALOG } from '../components';
import { meta } from '../meta';
import { HelpAction } from '../types';

import { HelpCapabilities } from './capabilities';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    GraphBuilder.createExtension({
      id: meta.id,
      match: NodeMatcher.whenRoot,
      actions: () => [
        {
          id: HelpAction.Start._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
            const state = context.getCapability(HelpCapabilities.MutableState);
            state.showHints = true;
            await dispatch(createIntent(HelpAction.Start));
          },
          properties: {
            label: ['open help tour', { ns: meta.id }],
            icon: 'ph--info--regular',
            keyBinding: {
              macos: 'shift+meta+/',
              // TODO(wittjosiah): Test on windows to see if it behaves the same as linux.
              windows: 'shift+ctrl+/',
              linux: 'shift+ctrl+?',
            },
            testId: 'helpPlugin.openHelp',
          },
        },
        {
          id: `${meta.id}/open-shortcuts`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
            const state = context.getCapability(HelpCapabilities.MutableState);
            state.showHints = true;
            await dispatch(
              createIntent(LayoutAction.UpdateDialog, {
                part: 'dialog',
                subject: SHORTCUTS_DIALOG,
                options: {
                  blockAlign: 'center',
                },
              }),
            );
          },
          properties: {
            label: ['open shortcuts label', { ns: meta.id }],
            icon: 'ph--keyboard--regular',
            keyBinding: {
              macos: 'meta+ctrl+/',
            },
          },
        },
      ],
    }),
  ),
);
