//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, GraphPath, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { Channel, Message } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';

import { getChannelsPath } from '../paths';
import { type ThreadSelection, type ThreadSummary, foldThreads, getThreadNodeId } from '../types';

const channelTypename = Type.getTypename(Channel.Channel);

/** Graph node type for a thread; distinct from `Message` so it claims its own surface. */
const THREAD_NODE_TYPE = `${meta.profile.key}/thread`;

/** Label for an unnamed thread: the first line of its root message, else its first reply. */
const getThreadFallbackLabel = (thread: ThreadSummary): string => {
  const source = thread.root ?? thread.replies[0];
  const text = source?.blocks
    .flatMap((block) => (block._tag === 'text' ? [block.text] : []))
    .join(' ')
    .trim();
  return text?.length ? text : thread.threadId;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      TypeSection.createTypeSectionExtension(Channel.Channel, {
        urlKey: 'channel',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.communications),
        groupSegment: GraphPath.GroupSegments.communications,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenCreateObject, {
            target: space.db,
            typename: channelTypename,
            targetNodeId: getChannelsPath(space.db.spaceId),
          }),
      }),

      // Every thread in a channel's feed, as a child of the channel node. Threads have no object of
      // their own — a thread is the `threadId` partition of the feed, keyed by its root message —
      // so the node carries a `(channel, threadId)` selection and the channel article opens onto it.
      GraphBuilder.createTypeExtension({
        id: 'channelThreads',
        type: Channel.Channel,
        connector: (channel, get) => {
          const db = Obj.getDatabase(channel);
          const feed = Channel.getFeed(channel);
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const messages = get(db.query(Query.select(Filter.type(Message.Message)).from(feed)).atom);
          const threads = foldThreads(messages);

          return Effect.succeed(
            [...threads.values()]
              // Ordered by most recent activity, so an active thread surfaces without hunting.
              .sort((left, right) => (right.lastActivity ?? '').localeCompare(left.lastActivity ?? ''))
              .map((thread) =>
                Node.make({
                  id: getThreadNodeId(channel, thread.threadId),
                  type: THREAD_NODE_TYPE,
                  data: { channel, threadId: thread.threadId } satisfies ThreadSelection,
                  properties: {
                    label: thread.name ?? getThreadFallbackLabel(thread),
                    icon: 'ph--chats-circle--regular',
                  },
                }),
              ),
          );
        },
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
              variant: 'chat',
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
