//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { GraphBuilder } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { Channel } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';

import { getChannelsPath } from '../paths';

const channelTypename = Type.getTypename(Channel.Channel);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      TypeSection.createTypeSectionExtension(Channel.Channel, {
        // Channel's schema lives in `@dxos/types`, which app-toolkit depends on — it cannot carry
        // `AppAnnotation.UrlPrefixAnnotation` without a cycle, so the key is set explicitly here.
        urlKey: 'channel',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.communications),
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenCreateObject, {
            target: space.db,
            typename: channelTypename,
            targetNodeId: getChannelsPath(space.db.spaceId),
          }),
      }),

      GraphBuilder.createTypeExtension({
        id: 'channelChatCompanion',
        type: Channel.Channel,
        connector: (channel, get) => {
          const [callManager] = get(capabilities.atom(CallsCapabilities.Manager));
          if (!callManager) {
            return Effect.succeed([]);
          }
          const joined = get(callManager.joinedAtom);
          const roomId = get(callManager.roomIdAtom);
          if (!joined || roomId !== Obj.getURI(channel)) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeCompanion({
              id: 'chat',
              label: ['channel-companion.label', { ns: meta.profile.key }],
              icon: 'ph--hash--regular',
              data: 'chat',
              position: Position.first,
            }),
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
