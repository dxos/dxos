//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, LayoutOperation } from '@dxos/app-toolkit';
import { linkedSegment } from '@dxos/react-ui-attention';
import { type Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention/types';
import { invokeFunctionWithTracing } from '@dxos/plugin-automation/hooks';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';

import { ClearSyncedVideos, Sync } from '#operations';
import { meta } from '#meta';
import { Channel, Video } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const selectionManager = yield* Capability.get(AttentionCapabilities.Selection);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const state = get(selectionManager.state);
        const selection = state.selections[nodeId];
        return selection?.mode === 'single' ? selection.id : undefined;
      }),
    );

    const whenYouTubeChannel = NodeMatcher.whenEchoType(Channel.YouTubeChannel);

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'channel-video',
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
            AppNode.makeCompanion({
              id: linkedSegment('video'),
              label: ['video.label', { ns: meta.id }],
              icon: 'ph--play--regular',
              data: video ?? 'video',
            }),
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: 'sync-channel',
        match: whenYouTubeChannel,
        actions: (channel) =>
          Effect.succeed([
            Node.makeAction({
              id: 'sync',
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(channel);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    invokeFunctionWithTracing(Sync, {
                      channel: Ref.make(channel),
                    }),
                  ),
                ).pipe(
                  Effect.catchAll((error) => {
                    log.catch(error);
                    return Operation.invoke(LayoutOperation.AddToast, {
                      id: 'sync-channel-error',
                      icon: 'ph--warning--regular',
                      duration: 5_000,
                      title: ['sync-channel-error.title', { ns: meta.id }],
                      closeLabel: ['close.label', { ns: meta.id }],
                    });
                  }),
                );
              }),
              properties: {
                label: ['sync-channel.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            }),
            Node.makeAction({
              id: 'clear-synced-videos',
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(channel);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    invokeFunctionWithTracing(ClearSyncedVideos, {
                      channel: Ref.make(channel),
                    }),
                  ),
                ).pipe(
                  Effect.catchAll((error) => {
                    log.catch(error);
                    return Operation.invoke(LayoutOperation.AddToast, {
                      id: 'clear-synced-videos-error',
                      icon: 'ph--warning--regular',
                      duration: 5_000,
                      title: ['clear-synced-videos-error.title', { ns: meta.id }],
                      closeLabel: ['close.label', { ns: meta.id }],
                    });
                  }),
                );
              }),
              properties: {
                label: ['clear-synced-videos.label', { ns: meta.id }],
                icon: 'ph--trash--regular',
                disposition: 'list-item',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
