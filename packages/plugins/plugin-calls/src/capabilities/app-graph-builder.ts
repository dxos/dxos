//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { CallsCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'activeCall',
        match: NodeMatcher.whenRoot,
        connector: (node, get) => {
          const callManagerAtom = capabilities.atom(CallsCapabilities.Manager);
          const [call] = get(callManagerAtom);
          if (!call) {
            return Effect.succeed([]);
          }
          const joined = get(call.joinedAtom);
          return Effect.succeed(
            joined
              ? [
                  AppNode.makeDeckCompanion({
                    id: 'activeCall',
                    label: ['call-panel.label', { ns: meta.profile.key }],
                    icon: 'ph--video-conference--regular',
                    data: null,
                    position: Position.first,
                  }),
                ]
              : [],
          );
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
