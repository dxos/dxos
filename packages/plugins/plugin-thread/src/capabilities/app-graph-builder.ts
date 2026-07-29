//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, GraphPath, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientCapabilities } from '@dxos/plugin-client';
import { CreateAtom, GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { Channel, Message } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';

import { getChannelsPath } from '../paths';
import {
  ThreadAnnotation,
  ThreadOperation,
  type ThreadSelection,
  foldThreads,
  getThreadNodeId,
  selectRoots,
  senderKey,
} from '../types';

const channelTypename = Type.getTypename(Channel.Channel);

/** Graph node type for a thread; distinct from `Message` so it claims its own surface. */
const THREAD_NODE_TYPE = `${meta.profile.key}/thread`;

/** Label for an unnamed thread: the text of its root message, else the bare thread id. */
const getThreadFallbackLabel = (root: Message.Message): string => {
  const text = root.blocks
    .flatMap((block) => (block._tag === 'text' ? [block.text] : []))
    .join(' ')
    .trim();
  return text.length ? text : root.id;
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

      // Every thread of a channel, as a child of the channel node. Threads have no object of their
      // own — a thread is the `threadId` partition of the feed, keyed by its root message — so the
      // node carries a `(channel, threadId)` selection and its own article renders onto it.
      //
      // One node per root message, not per thread that already has replies: starting a thread opens
      // its plank before the first reply exists, and a plank needs a node to resolve. Marking the
      // root instead ("this message has a thread") is not open to us — that would re-append someone
      // else's message, which the feed's single-writer rule forbids.
      GraphBuilder.createTypeExtension({
        id: 'channelThreads',
        type: Channel.Channel,
        connector: (channel, get) =>
          Effect.sync(() => {
            const db = Obj.getDatabase(channel);
            const feed = Channel.getFeed(channel);
            if (!db || !feed) {
              return [];
            }

            const [client] = get(capabilities.atom(ClientCapabilities.Client));
            const identity = client && get(CreateAtom.fromObservable(client.halo.identity));
            const messages = get(db.query(Query.select(Filter.type(Message.Message)).from(feed)).atom);
            const threads = foldThreads(messages);
            const lastActivity = (root: Message.Message): string => threads.get(root.id)?.lastActivity ?? root.created;

            return (
              selectRoots(messages)
                // Ordered by most recent activity, so an active thread surfaces without hunting.
                .toSorted((left, right) => lastActivity(right).localeCompare(lastActivity(left)))
                .map((root) => {
                  // Renaming re-appends the root message, so it is offered to its author alone (see
                  // `ThreadOperation.RenameThread`).
                  const canRename = !!identity && senderKey(root.sender) === identity.did;

                  return Node.make({
                    id: getThreadNodeId(root.id),
                    type: THREAD_NODE_TYPE,
                    data: { channel, threadId: root.id } satisfies ThreadSelection,
                    properties: {
                      label:
                        threads.get(root.id)?.name ?? ThreadAnnotation.getName(root) ?? getThreadFallbackLabel(root),
                      icon: 'ph--chats-circle--regular',
                      draggable: false,
                      droppable: false,
                      testId: 'threadPlugin.thread',
                    },
                    actions: canRename
                      ? [
                          Node.makeAction({
                            id: 'rename-thread',
                            data: (params?: Node.InvokeProps) =>
                              Operation.invoke(ThreadOperation.RenameThread, {
                                root,
                                caller: `${params?.caller}:${params?.parent?.id}`,
                              }),
                            properties: {
                              label: ['rename-thread.label', { ns: meta.profile.key }],
                              icon: 'ph--pencil-simple--regular',
                              disposition: 'list-item',
                            },
                          }),
                        ]
                      : undefined,
                  });
                })
            );
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
