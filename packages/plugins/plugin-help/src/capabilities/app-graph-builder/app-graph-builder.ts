//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/app-graph';
import { Operation } from '@dxos/operation';

import { SHORTCUTS_DIALOG } from '../../components';
import { meta } from '../../meta';
import { HelpCapabilities, HelpOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: meta.id,
      match: NodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          {
            id: HelpOperation.Start.meta.key,
            data: Effect.fnUntraced(function* () {
              yield* Common.Capability.updateAtomValue(HelpCapabilities.State, (s) => ({ ...s, showHints: true }));
              yield* Operation.invoke(HelpOperation.Start);
            }),
            properties: {
              label: ['open help tour', { ns: meta.id }],
              icon: 'ph--info--regular',
              keyBinding: {
                macos: 'shift+meta+/',
                windows: 'shift+ctrl+/',
                linux: 'shift+ctrl+?',
              },
              testId: 'helpPlugin.openHelp',
            },
          },
          {
            id: `${meta.id}/open-shortcuts`,
            data: Effect.fnUntraced(function* () {
              yield* Common.Capability.updateAtomValue(HelpCapabilities.State, (s) => ({ ...s, showHints: true }));
              yield* Operation.invoke(Common.LayoutOperation.UpdateDialog, {
                subject: SHORTCUTS_DIALOG,
                blockAlign: 'center',
              });
            }),
            properties: {
              label: ['open shortcuts label', { ns: meta.id }],
              icon: 'ph--keyboard--regular',
              keyBinding: {
                macos: 'meta+ctrl+/',
              },
            },
          },
        ]),
    });

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
