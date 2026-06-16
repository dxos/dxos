//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { NodeMatcher, GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { CallsCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      // The active-call panel is integration-agnostic (any call, however started), so it lives here.
      // Integration-specific surfaces (channel chat, meeting notes) are contributed by their own plugins.
      GraphBuilder.createExtension({
        id: 'activeCall',
        match: NodeMatcher.whenRoot,
        connector: (node, get) => {
          const callManagerAtom = capabilities.atom(CallsCapabilities.Manager);
          const [call] = get(callManagerAtom);
          if (!call) {
            return Effect.succeed([]);
          }
          // Use derived joinedAtom for efficient subscription.
          const joined = get(call.joinedAtom);
          return Effect.succeed(
            joined
              ? [
                  AppNode.makeDeckCompanion({
                    // Id becomes the companion's variant; the surface registers role
                    // `deck-companion--activeCall`, so the id must match.
                    id: 'activeCall',
                    label: ['call-panel.label', { ns: meta.id }],
                    icon: 'ph--video-conference--regular',
                    data: null,
                    position: 'first',
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
