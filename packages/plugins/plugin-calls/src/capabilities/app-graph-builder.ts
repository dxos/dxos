//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { Channel } from '@dxos/types';

import { meta } from '#meta';
import { CallsCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'active-call',
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
                    id: 'active-call',
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
      GraphBuilder.createTypeExtension({
        id: 'channel-chat-companion',
        type: Channel.Channel,
        connector: (channel, get) => {
          const callManagerAtom = capabilities.atom(CallsCapabilities.Manager);
          const [callManager] = get(callManagerAtom);
          if (!callManager) {
            return Effect.succeed([]);
          }
          // Use derived atoms for efficient subscription.
          const joined = get(callManager.joinedAtom);
          const roomId = get(callManager.roomIdAtom);
          const isActive = joined && roomId === Obj.getURI(channel);
          if (!isActive) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeCompanion({
              id: 'chat',
              label: ['channel-companion.label', { ns: meta.id }],
              icon: 'ph--hash--regular',
              data: 'chat',
              position: 'first',
            }),
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
