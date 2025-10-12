//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { createExtension } from '@dxos/app-graph';

import { SHORTCUTS_DIALOG } from '../components';
import { meta } from '../meta';
import { HelpAction } from '../types';

import { HelpCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: meta.id,
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
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  );
