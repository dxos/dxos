//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { COMMANDS_DIALOG, meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* AppGraphBuilder.createExtension({
      id: 'root',
      match: GraphNodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: COMMANDS_DIALOG,
            data: () =>
              Operation.invoke(LayoutOperation.UpdateDialog, {
                subject: COMMANDS_DIALOG,
                blockAlign: 'start',
              }),
            properties: {
              label: ['open-commands.label', { ns: meta.profile.key }],
              icon: 'ph--magnifying-glass--regular',
              keyBinding: {
                macos: 'shift+meta+k',
                windows: 'ctrl+shift+k',
              },
            },
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
