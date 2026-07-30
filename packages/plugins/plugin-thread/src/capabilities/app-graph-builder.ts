//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, GraphPath, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation, Feed, Filter, Obj, Query, Type } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { Channel, Message } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';

import { getChannelsPath } from '../paths';
import { THREAD_ID_PROPERTY, ThreadOperation, foldThreads, getThreadNodeId, selectRoots } from '../types';

const channelTypename = Type.getTypename(Channel.Channel);

/** Hue of the Channel type's icon, so a thread's icon matches the channel it belongs to. */
const channelHue = Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(Channel.Channel)))?.hue;

/** Graph node type for a thread; distinct from `Message` so it claims its own surface. */
const THREAD_NODE_TYPE = `${meta.profile.key}/thread`;

/**
 * A channel's *own* node, not any node that carries a channel: a thread node carries the channel it
 * belongs to (the thread id is metadata beside it), so matching on the data type alone would hang
 * every thread of a channel under each of its threads, without end.
 */
const whenChannelNode: NodeMatcher.NodeMatcher<Channel.Channel> = (node, get) =>
  node.type === THREAD_NODE_TYPE ? Option.none() : NodeMatcher.whenEchoType(Channel.Channel)(node, get);

/** Label for an unnamed thread: the text of its root message, else the bare thread id. */
const getThreadFallbackLabel = (root: Message.Message): string => {
  const text = root.blocks
    .flatMap((block) => (block._tag === 'text' ? [block.text] : []))
    .join(' ')
    .trim();
  return text.length ? text : root.id;
};

/**
 * Every thread of a channel, as a child of the channel node. Threads have no object of their own — a
 * thread is the `threadId` partition of the feed, keyed by its root message — so the node carries the
 * channel as its object and the thread id as metadata beside it, and its own article renders onto it.
 *
 * Only threads that exist: one someone created (which marks its root message) or one that already
 * holds replies. Every root message is a *potential* thread, but treating it as one would list the
 * whole channel here — creating a thread is a deliberate act.
 *
 * Exported so a test can expand the relation for real: a connector that throws takes the channel's
 * entire `child` relation with it, which has emptied the navtree of threads twice without a failure.
 */
export const createChannelThreadsExtension = Effect.fnUntraced(function* () {
  return yield* GraphBuilder.createExtension({
    id: 'channelThreads',
    match: whenChannelNode,
    connector: (channel, get) =>
      Effect.sync(() => {
        const db = Obj.getDatabase(channel);
        // Read the backend config through its ref atom rather than `Channel.getFeed`: the navtree
        // expands a channel before anything has resolved that ref, and a connector that returns on an
        // unresolved `.target` has registered no dependency to bring it back — the channel would list
        // no threads for the rest of the session.
        const config = channel.backend.kind === Channel.FeedBackendKind ? get(channel.backend.config.atom) : undefined;
        const feed = Obj.instanceOf(Feed.Feed, config) ? config : undefined;
        if (!db || !feed) {
          return [];
        }

        const messages = get(db.query(Query.select(Filter.type(Message.Message)).from(feed)).atom);
        // A query reports its result set, so creating or renaming a thread — which marks a message
        // already in that set — moves nothing it would report. Each message's own atom is what
        // notices, and `Obj.atom` is keyed by the object, so re-reading them costs no subscription.
        messages.forEach((message) => get(Obj.atom(message)));
        const rootsById = new Map(selectRoots(messages).map((message) => [message.id, message]));

        return (
          [...foldThreads(messages).values()]
            // Ordered by most recent activity, so an active thread surfaces without hunting.
            .toSorted((left, right) => (right.lastActivity ?? '').localeCompare(left.lastActivity ?? ''))
            .map((thread) => {
              // Naming writes the root message's own annotation, so it needs that message — a thread
              // whose root has been deleted keeps its replies but cannot be renamed.
              const root = thread.root ?? rootsById.get(thread.threadId);

              return Node.make({
                id: getThreadNodeId(thread.threadId),
                type: THREAD_NODE_TYPE,
                // The channel is the node's object and the thread scopes it, as a mailbox filter
                // node carries the mailbox and its filter.
                data: channel,
                properties: {
                  [THREAD_ID_PROPERTY]: thread.threadId,
                  label: thread.name ?? (root ? getThreadFallbackLabel(root) : thread.threadId),
                  icon: 'ph--chats-circle--regular',
                  // A thread reads as part of its channel, so it takes the Channel type's hue rather
                  // than one of its own.
                  ...(channelHue ? { iconHue: channelHue } : {}),
                  draggable: false,
                  droppable: false,
                  testId: 'threadPlugin.thread',
                },
                actions: root
                  ? [
                      Node.makeAction({
                        id: 'rename-thread',
                        data: (params?: Node.InvokeProps) =>
                          Operation.invoke(ThreadOperation.RenameThread, {
                            message: root,
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
  });
});

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

      createChannelThreadsExtension(),

      GraphBuilder.createExtension({
        id: 'channelChatCompanion',
        match: whenChannelNode,
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
