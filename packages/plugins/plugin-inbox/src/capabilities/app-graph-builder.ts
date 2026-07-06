//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths, TypeSection } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { type Feed, Filter, Key, Obj, Order, Query, Ref, Type } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Connection, ConnectorOperation, SyncBinding } from '@dxos/plugin-connector';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { getLinkedVariant, isLinkedSegment, linkedSegment, selectionAspect } from '@dxos/react-ui-attention';
import { Event, Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';
import { InboxOperation } from '#types';
import { Calendar, DraftMessage, Mailbox } from '#types';

import { MAILBOX_DRAFTS_NODE_DATA, MAILBOX_DRAFTS_TYPE, MAILBOXES_SECTION_TYPE } from '../constants';
import { getCalendarsPath, getDraftsId, getMailboxesPath, getMailboxesSectionId } from '../paths';

const calendarTypename = Type.getTypename(Calendar.Calendar);

const FILTER_TYPE = `${Type.getTypename(Mailbox.Mailbox)}-filter`;

// The navtree new-message badge only needs to distinguish "some new" up to a cap, so it queries a
// bounded newest-N window instead of the whole feed. This keeps the always-mounted count query from
// loading (and pinning the client's retention window to) the entire mailbox — the badge saturates at
// this many rather than reporting an exact count for very large unread backlogs.
const NEW_MESSAGE_COUNT_WINDOW = 100;

type FeedObjectNodeConfig<Parent extends Obj.Unknown, Child extends Obj.Unknown> = {
  id: string;
  /** Parent ECHO type entity; derives the parent filter and (by default) the path segment name. */
  parentType: Type.AnyEntity;
  /**
   * Override the path segment used to locate the parent ID.
   * Defaults to `Type.getTypename(parentType)`.
   * Required when the parent lives under a custom section segment (e.g. mailboxes use `'mailboxes'`).
   */
  parentSegmentName?: string;
  /** Child ECHO type entity; derives the node type string. */
  childType: Type.AnyEntity;
  /** Resolve the feed for the parent, using the reactive getter to dereference the feed ref. */
  getFeed: (parent: Parent, get: (atom: any) => any) => Feed.Feed | undefined;
  /** Validate a db-fallback object as a child of this parent (not needed for feed-sourced objects). */
  isDbChild: (parent: Parent, obj: Obj.Unknown) => obj is Child;
  getNodeLabel: (child: Child) => string | [string, { ns: string }];
  nodeIcon: string;
};

/**
 * Creates a hidden, navigable feed-object node extension using the `~childId` linked-segment path pattern.
 * Resolves paths of the form `root/<spaceId>/…/<parentId>/~<childId>` to a hidden node for the child object.
 * Used for mailbox messages and calendar events, which live in a parent's feed rather than the space db directly.
 */
const createFeedObjectNodeExtension = <Parent extends Obj.Unknown, Child extends Obj.Unknown>(
  config: FeedObjectNodeConfig<Parent, Child>,
) =>
  GraphBuilder.createExtension({
    id: config.id,
    match: () => Option.none(),
    resolver: (qualifiedId, get) =>
      Effect.gen(function* () {
        if (!isLinkedSegment(qualifiedId)) {
          return null;
        }

        const segments = qualifiedId.split('/');
        const childId = getLinkedVariant(qualifiedId);
        const spaceId = Paths.getSpaceIdFromPath(qualifiedId);
        const segmentName = config.parentSegmentName ?? Type.getTypename(config.parentType);
        const segmentIdx = segments.indexOf(segmentName);
        const parentId = segmentIdx >= 0 ? segments[segmentIdx + 1] : undefined;

        if (!spaceId || !parentId || !Key.EntityId.isValid(parentId) || !Key.EntityId.isValid(childId)) {
          return null;
        }

        const client = yield* Capability.get(ClientCapabilities.Client);
        const space = client.spaces.get(spaceId);
        if (!space) {
          return null;
        }

        // parentType is a runtime entity; Filter.type resolves to Filter<Parent> at the type boundary.
        const parents = get(space.db.query(Filter.type(config.parentType)).atom) as Parent[];
        const parent = parents.find((p) => p.id === parentId);
        if (!parent) {
          return null;
        }

        const feed = config.getFeed(parent, get);

        let child: Child | undefined;
        if (feed) {
          // Objects sourced from the parent's feed are already scoped correctly; no extra type check needed.
          child = get(space.db.query(Query.select(Filter.id(childId)).from(feed)).atom)[0] as Child | undefined;
        }
        if (!child) {
          const fromDb = get(space.db.query(Query.select(Filter.id(childId))).atom)[0];
          if (fromDb && config.isDbChild(parent, fromDb)) {
            child = fromDb;
          }
        }
        if (!child) {
          return null;
        }

        return {
          id: qualifiedId,
          type: Type.getTypename(config.childType),
          data: child,
          properties: {
            label: config.getNodeLabel(child),
            icon: config.nodeIcon,
            disposition: 'hidden',
          },
        };
      }).pipe(Effect.orDie),
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
    // Derive a single-mode selected id per context from the ViewStateManager selection slice.
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const selection = get(viewState.atom(selectionAspect, nodeId));
        return selection.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'mailboxesSection',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.communications),
        connector: (space, get) => {
          const mailboxes = get(space.db.query(Filter.type(Mailbox.Mailbox)).atom);
          if (mailboxes.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeSection({
              id: getMailboxesSectionId(),
              type: MAILBOXES_SECTION_TYPE,
              label: ['mailboxes-section.label', { ns: meta.profile.key }],
              icon: 'ph--tray--regular',
              iconHue: 'rose',
              space,
              position: 301,
            }),
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: 'mailboxListing',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === MAILBOXES_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const mailboxes = get(space.db.query(Filter.type(Mailbox.Mailbox)).atom);

          return Effect.succeed(
            mailboxes.map((mailbox: Mailbox.Mailbox) => {
              const mailboxSnapshot = get(Obj.atom(mailbox));
              const feed = mailboxSnapshot.feed ? get(mailboxSnapshot.feed.atom) : undefined;
              const messages = feed
                ? get(space.db.query(Query.select(Filter.type(Message.Message)).from(feed).limit(NEW_MESSAGE_COUNT_WINDOW)).atom)
                : [];
              const modifiedCount = Mailbox.getNewMessageCount(mailboxSnapshot, messages);

              return Node.make({
                id: mailboxSnapshot.id,
                type: Type.getTypename(Mailbox.Mailbox),
                data: mailbox,
                properties: {
                  label: mailboxSnapshot.name ?? ['object-name.placeholder', { ns: Type.getTypename(Mailbox.Mailbox) }],
                  icon: 'ph--tray--regular',
                  iconHue: 'rose',
                  role: 'branch',
                  modifiedCount,
                },
                nodes: [
                  Node.make({
                    id: getDraftsId(),
                    type: MAILBOX_DRAFTS_TYPE,
                    data: MAILBOX_DRAFTS_NODE_DATA,
                    properties: {
                      label: ['drafts.label', { ns: meta.profile.key }],
                      icon: 'ph--pencil-simple--regular',
                      iconHue: 'rose',
                      mailbox,
                    },
                  }),
                  ...(mailboxSnapshot.filters?.map(({ name, filter }: { name: string; filter: any }) =>
                    Node.make({
                      id: `filter-${kebabize(name)}`,
                      type: FILTER_TYPE,
                      data: mailbox,
                      properties: {
                        label: name,
                        icon: 'ph--funnel--regular',
                        iconHue: 'rose',
                        filter,
                      },
                      actions: [
                        Node.makeAction({
                          id: 'rename-filter',
                          data: (params?: Node.InvokeProps) =>
                            Operation.invoke(InboxOperation.RenameFilter, {
                              mailbox,
                              name,
                              caller: `${params?.caller}:${params?.parent?.id}`,
                            }),
                          properties: {
                            label: ['rename-filter.label', { ns: meta.profile.key }],
                            icon: 'ph--pencil-simple--regular',
                            disposition: 'list-item',
                          },
                        }),
                        Node.makeAction({
                          id: 'delete-filter',
                          data: () =>
                            Effect.sync(() => {
                              Obj.update(mailbox, (mailbox) => {
                                const index = mailbox.filters.findIndex((f: any) => f.name === name);
                                if (index >= 0) {
                                  mailbox.filters.splice(index, 1);
                                }
                              });
                            }),
                          properties: {
                            label: ['delete-filter.label', { ns: meta.profile.key }],
                            icon: 'ph--trash--regular',
                            disposition: 'list-item',
                          },
                        }),
                      ],
                    }),
                  ) ?? []),
                ],
              });
            }),
          );
        },
      }),

      GraphBuilder.createExtension({
        id: 'mailboxDrafts',
        match: NodeMatcher.whenNodeType(MAILBOX_DRAFTS_TYPE),
        connector: (node, get) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
          if (!mailbox || !db) {
            return Effect.succeed([]);
          }

          const mailboxUri = Obj.getURI(mailbox);
          const messageId = get(selectedId(node.id));
          const message = messageId ? get(db.query(Query.select(Filter.id(messageId))).atom)[0] : undefined;
          const draft = message && DraftMessage.belongsTo(message, mailboxUri) ? message : undefined;
          return Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('message'),
              label: ['message.label', { ns: meta.profile.key }],
              icon: 'ph--envelope-open--regular',
              data: draft ?? 'message',
            }),
          ]);
        },
        actions: (node) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
          if (!mailbox || !db) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            Node.makeAction({
              id: 'createDraft',
              data: () => Operation.invoke(InboxOperation.DraftEmailAndOpen, { db, mailbox }),
              properties: {
                label: ['create-draft.label', { ns: meta.profile.key }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: 'mailboxMessage',
        match: (node) =>
          Mailbox.instanceOf(node.data) ? Option.some({ mailbox: node.data, nodeId: node.id }) : Option.none(),
        connector: (matched, get) => {
          const mailbox = matched.mailbox;
          const db = Obj.getDatabase(mailbox);
          const feed = mailbox.feed ? (get(mailbox.feed.atom) as Feed.Feed | undefined) : undefined;
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const messageId = get(selectedId(matched.nodeId));
          // Resolve the selected message via the host indexer, not the client feed's newest-by-position
          // window: the mailbox list orders by date, so a selected message can be outside that window
          // (making the companion blank). The list's messages are all indexed, so the indexer resolves
          // them by id — a content `orderBy` (not `natural`) is what routes this to the host (see
          // `queryContainsContentOrder` in `isClientEvaluableFeedQuery`).
          const message = get(
            db.query(
              Query.select(messageId ? Filter.id(messageId) : Filter.nothing())
                .from(feed)
                .orderBy(Order.property('created', 'desc')),
            ).atom,
          )[0];
          return Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('message'),
              label: ['message.label', { ns: meta.profile.key }],
              icon: 'ph--envelope-open--regular',
              data: message ?? 'message',
            }),
          ]);
        },
      }),

      createFeedObjectNodeExtension<Mailbox.Mailbox, Message.Message>({
        id: 'feedObjectNode',
        parentType: Mailbox.Mailbox,
        // Mailboxes live under a custom 'mailboxes' section segment, not their ECHO typename.
        parentSegmentName: getMailboxesSectionId(),
        childType: Message.Message,
        getFeed: (mailbox, get) => (mailbox.feed ? (get(mailbox.feed.atom) as Feed.Feed | undefined) : undefined),
        // obj is cast to Message.Message because DraftMessage.belongsTo checks message-specific structure;
        // the type guard itself is the runtime proof.
        isDbChild: (mailbox, obj): obj is Message.Message =>
          DraftMessage.belongsTo(obj as Message.Message, Obj.getURI(mailbox)),
        getNodeLabel: (message) => message.properties?.subject ?? ['message.label', { ns: meta.profile.key }],
        nodeIcon: 'ph--envelope-open--regular',
      }),

      GraphBuilder.createExtension({
        id: 'mailboxesSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === MAILBOXES_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-mailbox',
              data: () =>
                Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: space.db,
                  typename: Type.getTypename(Mailbox.Mailbox),
                  targetNodeId: getMailboxesPath(space.db.spaceId),
                }),
              properties: {
                label: ['add-object.label', { ns: Type.getTypename(Mailbox.Mailbox) }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
      }),

      TypeSection.createTypeSectionExtension(Calendar.Calendar, {
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.communications),
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenCreateObject, {
            target: space.db,
            typename: calendarTypename,
            targetNodeId: getCalendarsPath(space.db.spaceId),
          }),
      }),

      GraphBuilder.createExtension({
        id: 'calendarEvent',
        match: (node) =>
          Calendar.instanceOf(node.data) ? Option.some({ calendar: node.data, nodeId: node.id }) : Option.none(),
        connector: (matched, get) => {
          const calendar = matched.calendar;
          const db = Obj.getDatabase(calendar);
          const feed = calendar.feed ? (get(calendar.feed.atom) as Feed.Feed | undefined) : undefined;
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const eventId = get(selectedId(matched.nodeId));
          const fromFeed = get(
            db.query(Query.select(eventId ? Filter.id(eventId) : Filter.nothing()).from(feed)).atom,
          )[0];
          // Draft events live in the space db (not the feed); fall back to a db lookup so the
          // companion resolves a locally-created event too.
          const fromDb = eventId ? get(db.query(Query.select(Filter.id(eventId))).atom)[0] : undefined;
          const event = fromFeed ?? fromDb;
          const nodes = [
            AppNode.makeCompanion({
              id: linkedSegment('event'),
              label: ['event.label', { ns: meta.profile.key }],
              icon: 'ph--calendar-dot--regular',
              data: event ?? 'event',
            }),
          ];
          if (event) {
            // Produce an event-specific hidden node so graph extensions can attach
            // `whenEchoType(Event.Event)` actions (e.g. plugin-meeting's "Create meeting")
            // regardless of whether the event has been navigated to.
            nodes.push(
              Node.make({
                id: linkedSegment(event.id),
                type: Type.getTypename(Event.Event),
                data: event,
                properties: {
                  label: event.title ?? ['event.label', { ns: meta.profile.key }],
                  icon: 'ph--calendar-dot--regular',
                  disposition: 'hidden',
                },
              }),
            );
          }
          return Effect.succeed(nodes);
        },
      }),

      // Resolves a URI-keyed event node for deep-link / bookmark paths that use the EID format
      // (e.g. navigating directly to echo:<spaceId>/<eventId>). Events live in a calendar's feed
      // (Google sync), with a space-db fallback for locally-created drafts.
      GraphBuilder.createExtension({
        id: 'eventObjectNode',
        match: () => Option.none(),
        resolver: (qualifiedId, get) =>
          Effect.gen(function* () {
            const eid = EID.tryParse(qualifiedId);
            if (!eid) {
              return null;
            }
            const spaceId = EID.getSpaceId(eid);
            const entityId = EID.getEntityId(eid);
            if (!spaceId || !entityId || !Key.EntityId.isValid(entityId)) {
              return null;
            }

            const client = yield* Capability.get(ClientCapabilities.Client);
            const space = client.spaces.get(spaceId);
            if (!space) {
              return null;
            }

            const calendars = get(space.db.query(Filter.type(Calendar.Calendar)).atom);
            let event: Event.Event | undefined;
            for (const calendar of calendars) {
              const calendarSnapshot = get(Obj.atom(calendar));
              const feed = calendarSnapshot.feed
                ? (get(calendarSnapshot.feed.atom) as Feed.Feed | undefined)
                : undefined;
              if (feed) {
                event = get(space.db.query(Query.select(Filter.id(entityId)).from(feed)).atom)[0];
              }
              if (event) {
                break;
              }
            }
            // Draft events live in the space db (not a feed); fall back to a db lookup.
            if (!event) {
              const fromDb = get(space.db.query(Query.select(Filter.id(entityId))).atom)[0];
              if (Obj.instanceOf(Event.Event, fromDb)) {
                event = fromDb;
              }
            }
            if (!event) {
              return null;
            }

            return {
              id: qualifiedId,
              type: Type.getTypename(Event.Event),
              data: event,
              properties: {
                label: event.title ?? ['event.label', { ns: meta.profile.key }],
                icon: 'ph--calendar-dot--regular',
                disposition: 'hidden',
              },
            };
          }).pipe(Effect.orDie),
      }),

      createFeedObjectNodeExtension<Calendar.Calendar, Event.Event>({
        id: 'calendarFeedObjectNode',
        parentType: Calendar.Calendar,
        childType: Event.Event,
        getFeed: (calendar, get) => (calendar.feed ? (get(calendar.feed.atom) as Feed.Feed | undefined) : undefined),
        isDbChild: (_, obj): obj is Event.Event => Obj.instanceOf(Event.Event, obj),
        getNodeLabel: (event) => event.title ?? ['event.label', { ns: meta.profile.key }],
        nodeIcon: 'ph--calendar-dot--regular',
      }),

      GraphBuilder.createExtension({
        id: 'syncMailbox',
        // Filter nodes store the parent mailbox as node.data; exclude them so sync only appears on the mailbox itself.
        match: (node) =>
          node.type === Type.getTypename(Mailbox.Mailbox) && Mailbox.instanceOf(node.data)
            ? Option.some(node.data)
            : Option.none(),
        actions: (mailbox, get) => {
          const db = Obj.getDatabase(mailbox);
          if (!db) {
            return Effect.succeed([]);
          }
          // The sync action appears only when a SyncBinding's source Connection targets this mailbox.
          // Delegate to the connector framework's `SyncConnection`, which resolves the connection's
          // connector and runs its `sync` op — no provider-specific branching here. Resolved via the
          // reverse-ref `.source()` query (reactive; loading it synchronously isn't reliable here).
          const connections = get(
            db.query(Query.select(Filter.id(mailbox.id)).targetOf(SyncBinding.SyncBinding).source()).atom,
          );
          const connection = connections.find(Connection.instanceOf);
          if (!connection) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'sync',
              data: () =>
                Operation.invoke(
                  ConnectorOperation.SyncConnection,
                  { connection: Ref.make(connection) },
                  {
                    spaceId: db.spaceId,
                    notify: {
                      success: ['sync-mailbox-success.title', { ns: meta.profile.key }],
                      error: ['sync-mailbox-error.title', { ns: meta.profile.key }],
                    },
                  },
                ),
              properties: {
                label: ['sync-mailbox.label', { ns: meta.profile.key }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: 'syncCalendar',
        match: (node) => (Calendar.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (calendar, get) => {
          const db = Obj.getDatabase(calendar);
          if (!db) {
            return Effect.succeed([]);
          }
          // The sync action appears only when a SyncBinding targets this calendar; the binding's
          // source Connection authenticates the sync.
          const bindings = get(db.query(Query.select(Filter.id(calendar.id)).targetOf(SyncBinding.SyncBinding)).atom);
          const binding = bindings.find(SyncBinding.instanceOf);
          if (!binding) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'sync',
              data: () =>
                Operation.invoke(
                  InboxOperation.GoogleCalendarSync,
                  {
                    binding: Ref.make(binding),
                  },
                  {
                    spaceId: db.spaceId,
                    notify: {
                      success: ['sync-calendar-success.title', { ns: meta.profile.key }],
                      error: ['sync-calendar-error.title', { ns: meta.profile.key }],
                    },
                  },
                ),
              properties: {
                label: ['sync-calendar.label', { ns: meta.profile.key }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
