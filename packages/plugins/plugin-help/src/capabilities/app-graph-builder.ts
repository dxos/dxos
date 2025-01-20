//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, LayoutAction, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/app-graph';

import { HelpCapabilities } from './capabilities';
import { SHORTCUTS_DIALOG } from '../components';
import { HELP_PLUGIN } from '../meta';
import { HelpAction } from '../types';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: HELP_PLUGIN,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: HelpAction.Start._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            const state = context.requestCapability(HelpCapabilities.MutableState);
            state.showHints = true;
            await dispatch(createIntent(HelpAction.Start));
          },
          properties: {
            label: ['open help tour', { ns: HELP_PLUGIN }],
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
          id: 'dxos.org/plugin/help/open-shortcuts',
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            const state = context.requestCapability(HelpCapabilities.MutableState);
            state.showHints = true;
            await dispatch?.(createIntent(LayoutAction.SetLayout, { element: 'dialog', component: SHORTCUTS_DIALOG }));
          },
          properties: {
            label: ['open shortcuts label', { ns: HELP_PLUGIN }],
            icon: 'ph--keyboard--regular',
            keyBinding: {
              macos: 'meta+ctrl+/',
            },
          },
        },
      ],
    }),
  );
