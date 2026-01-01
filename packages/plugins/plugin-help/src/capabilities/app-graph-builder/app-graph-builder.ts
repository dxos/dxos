//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/app-graph';

import { SHORTCUTS_DIALOG } from '../../components';
import { meta } from '../../meta';
import { HelpAction, HelpCapabilities, HelpOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.AppGraphBuilder,
      GraphBuilder.createExtension({
        id: meta.id,
        match: NodeMatcher.whenRoot,
        actions: () => [
          {
            id: HelpAction.Start._tag,
            data: async () => {
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              const state = context.getCapability(HelpCapabilities.MutableState);
              state.showHints = true;
              await invokePromise(HelpOperation.Start);
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
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              const state = context.getCapability(HelpCapabilities.MutableState);
              state.showHints = true;
              await invokePromise(Common.LayoutOperation.UpdateDialog, {
                subject: SHORTCUTS_DIALOG,
                blockAlign: 'center',
              });
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
  ),
);
