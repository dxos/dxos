//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, GraphPath, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Query, Type } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
// Node's NodeArg/RelationInput appear in the connector's inferred return type; importing it lets
// TypeScript name them in the emitted .d.ts for createChannelThreadsExtension.
// eslint-disable-next-line unused-imports/no-unused-imports
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { Channel, Message } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';

import { getChannelsPath } from '../paths';
import { Thread, foldThreads } from '../types';

const channelTypename = Type.getTypename(Channel.Channel);

/** The channel node, typed for the connector: `createExtension` infers its subject from the matcher. */
const whenChannel: NodeMatcher.NodeMatcher<Channel.Channel> = (node, get) =>
  NodeMatcher.whenEchoType(Channel.Channel)(node, get);

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
 * thread is an object in the channel's feed that its replies partition on, so the node carries that
 * object and its own article renders onto it.
 *
 * Only threads that exist: one someone created, or a partition that already holds replies. Every root
 * message is a *potential* thread, but treating it as one would list the whole channel here —
 * creating a thread is a deliberate act.
 *
 * Exported so a test can expand the relation for real: a connector that throws takes the channel's
 * entire `child` relation with it, which has emptied the navtree of threads twice without a failure.
 */
export const createChannelThreadsExtension = Effect.fnUntraced(function* () {
  return yield* GraphBuilder.createExtension({
    id: 'channelThreads',
    // A thread's node id is its object's id under the channel node, so beneath the channels section
    // path the pair encodes as `thread/<channelId>+<threadId>` — the same fixed-depth shape a mailbox
    // message uses, which is what lets a thread plank be linked to and restored.
    url: { key: 'thread', kind: 'item', path: [GraphPath.GroupSegments.communications, channelTypename] },
    match: whenChannel,
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
        const threads = get(db.query(Query.select(Filter.type(Thread.Thread)).from(feed)).atom);
        // A query reports its result set, so renaming a thread — a mutation of an object already in
        // it — moves nothing it would report. Each thread's own atom is what notices, and `Obj.atom`
        // is keyed by the object, so re-reading them costs no subscription.
        threads.forEach((thread) => get(Obj.atom(thread)));

        return (
          [...foldThreads(messages, threads).values()]
            // A node's datum is the thread itself, so a partition known only by its replies — seeded
            // or imported without a thread object — is readable in the channel but has no node here.
            // TODO(wittjosiah): Regenerate the onboarding exemplar with thread objects.
            .flatMap((summary) => (summary.thread ? [{ ...summary, thread: summary.thread }] : []))
            // Ordered by most recent activity, so an active thread surfaces without hunting.
            .toSorted((left, right) => (right.lastActivity ?? '').localeCompare(left.lastActivity ?? ''))
            .flatMap(({ thread, root }) => {
              // The canonical object node: label (from the type's label annotation), icon and hue
              // (from its icon annotation), and the object-name placeholder all come from the schema.
              const node = AppNode.makeObject({ get, db, object: thread, draggable: false, droppable: false });
              if (!node) {
                return [];
              }

              return [
                {
                  ...node,
                  properties: {
                    ...node.properties,
                    // Until it is named, a thread reads as the message it branches from — the
                    // placeholder says only that it is new.
                    ...(thread.name?.length || !root ? {} : { label: getThreadFallbackLabel(root) }),
                    testId: 'threadPlugin.thread',
                  },
                },
              ];
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
