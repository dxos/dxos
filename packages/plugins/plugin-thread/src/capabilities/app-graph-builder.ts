//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, GraphPath, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation, Filter, Obj, Query, Type } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientCapabilities } from '@dxos/plugin-client';
import { CreateAtom, GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { Channel, Message, ThreadRoot } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';

import { getChannelsPath } from '../paths';
import { ThreadOperation, type ThreadSelection, foldThreads, getThreadNodeId, selectRoots } from '../types';

const channelTypename = Type.getTypename(Channel.Channel);

/** Hue of the Channel type's icon, so a thread's icon matches the channel it belongs to. */
const channelHue = Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(Channel.Channel)))?.hue;

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
      // Only threads that exist: one someone declared (a `ThreadRoot` item) or one that already holds
      // replies. Every root message is a *potential* thread, but treating it as one would list the
      // whole channel here — creating a thread is a deliberate act.
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
            const declarations = get(db.query(Query.select(Filter.type(ThreadRoot.ThreadRoot)).from(feed)).atom);
            const rootsById = new Map(selectRoots(messages).map((message) => [message.id, message]));

            return (
              [...foldThreads(messages, declarations).values()]
                // Ordered by most recent activity, so an active thread surfaces without hunting.
                .toSorted((left, right) => (right.lastActivity ?? '').localeCompare(left.lastActivity ?? ''))
                .map((thread) => {
                  // Naming writes the caller's own declaration, so anyone may rename — but the write
                  // needs an identity to attribute it to and the root message to target.
                  const root = thread.root ?? rootsById.get(thread.threadId);

                  return Node.make({
                    id: getThreadNodeId(thread.threadId),
                    type: THREAD_NODE_TYPE,
                    data: { channel, threadId: thread.threadId } satisfies ThreadSelection,
                    properties: {
                      label: thread.name ?? (root ? getThreadFallbackLabel(root) : thread.threadId),
                      icon: 'ph--chats-circle--regular',
                      // A thread reads as part of its channel, so it takes the Channel type's hue rather
                      // than one of its own.
                      ...(channelHue ? { iconHue: channelHue } : {}),
                      draggable: false,
                      droppable: false,
                      testId: 'threadPlugin.thread',
                    },
                    actions:
                      root && identity
                        ? [
                            Node.makeAction({
                              id: 'rename-thread',
                              data: (params?: Node.InvokeProps) =>
                                Operation.invoke(ThreadOperation.RenameThread, {
                                  channel,
                                  message: root,
                                  creator: { identityDid: identity.did },
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
