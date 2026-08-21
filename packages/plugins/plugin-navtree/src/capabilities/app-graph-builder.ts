//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphBuilder from '@dxos/app-graph/GraphBuilder';
import * as Node from '@dxos/app-graph/Node';
import * as NodeMatcher from '@dxos/app-graph/NodeMatcher';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { COMMANDS_DIALOG, meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: 'root',
      match: NodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          Node.makeAction({
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
