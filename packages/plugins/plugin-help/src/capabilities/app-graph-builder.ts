//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, createIntent, LayoutAction, type PluginContext } from '@dxos/app-framework';
import { createExtension } from '@dxos/app-graph';

import { HelpCapabilities } from './capabilities';
import { SHORTCUTS_DIALOG } from '../components';
import { HELP_PLUGIN } from '../meta';
import { HelpAction } from '../types';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: HELP_PLUGIN,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === 'root' ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: HelpAction.Start._tag,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const state = context.getCapability(HelpCapabilities.MutableState);
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
                  label: ['open shortcuts label', { ns: HELP_PLUGIN }],
                  icon: 'ph--keyboard--regular',
                  keyBinding: {
                    macos: 'meta+ctrl+/',
                  },
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  );
