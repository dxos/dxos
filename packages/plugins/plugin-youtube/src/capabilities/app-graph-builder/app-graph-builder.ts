//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder } from '@dxos/plugin-graph';
import { type SelectionManager } from '@dxos/react-ui-attention';

import { YouTubeFunctions } from '../../functions';
import { meta } from '../../meta';
import { Channel, type Video } from '../../types';

/**
 * Atom family to derive the selected item ID from selection state.
 */
const selectedIdFamily = Atom.family((selectionManager: SelectionManager) =>
  Atom.family((nodeId: string) =>
    Atom.make((get) => {
      const state = get(selectionManager.state);
      const selection = state.selections[nodeId];
      return selection?.mode === 'single' ? selection.id : undefined;
    }),
  ),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/channel-video`,
        type: Channel.YouTubeChannel,
        connector: (channel, get) => {
          const queue = get(AtomRef.make(channel.queue));
          if (!queue) {
            return Effect.succeed([]);
          }

          const selectionManager = capabilities.get(AttentionCapabilities.Selection);
          const nodeId = Obj.getDXN(channel).toString();
          const videoId = get(selectedIdFamily(selectionManager)(nodeId));
          const video = get(
            AtomQuery.make<Video.YouTubeVideo>(queue, videoId ? Filter.id(videoId) : Filter.nothing()),
          )[0];
          return Effect.succeed([
            {
              id: `${nodeId}${ATTENDABLE_PATH_SEPARATOR}video`,
              type: PLANK_COMPANION_TYPE,
              data: video ?? 'video',
              properties: {
                label: ['video label', { ns: meta.id }],
                icon: 'ph--play--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/sync-channel`,
        type: Channel.YouTubeChannel,
        actions: (channel) =>
          Effect.succeed([
            {
              id: `${Obj.getDXN(channel).toString()}-sync`,
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(channel);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    invokeFunctionWithTracing(YouTubeFunctions.Sync, {
                      channel: Ref.make(channel),
                    }),
                  ),
                );
              }),
              properties: {
                label: ['sync channel label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
