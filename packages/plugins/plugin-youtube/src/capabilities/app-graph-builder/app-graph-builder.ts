//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder } from '@dxos/plugin-graph';

import { YouTubeFunctions } from '../../functions';
import { meta } from '../../meta';
import { Channel, Video } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const selectionManager = yield* Capability.get(AttentionCapabilities.Selection);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const state = get(selectionManager.state);
        const selection = state.selections[nodeId];
        return selection?.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}/channel-video`,
        match: (node) =>
          Channel.instanceOf(node.data) ? Option.some({ channel: node.data, nodeId: node.id }) : Option.none(),
        connector: (matched, get) => {
          const channel = matched.channel;
          const db = Obj.getDatabase(channel);
          const feed = channel.feed ? (get(AtomRef.make(channel.feed)) as Feed.Feed | undefined) : undefined;
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const videoId = get(selectedId(matched.nodeId));
          const video = get(
            AtomQuery.make<Video.YouTubeVideo>(
              db,
              Query.select(videoId ? Filter.id(videoId) : Filter.nothing()).from(feed),
            ),
          )[0];
          return Effect.succeed([
            {
              id: `${matched.nodeId}${ATTENDABLE_PATH_SEPARATOR}video`,
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

      GraphBuilder.createExtension({
        id: `${meta.id}/sync-channel`,
        match: (node) => (Channel.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (channel: Channel.YouTubeChannel) =>
          Effect.succeed([
            {
              id: 'sync',
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
