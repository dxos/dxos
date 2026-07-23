//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths, TypeSection } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Query, Type } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Connection, isCursorForTarget } from '@dxos/plugin-connector';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { DraftMessage, Event, Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';
import { Calendar, DraftEvent, InboxOperation, Mailbox, SystemTags } from '#types';

import { MAILBOX_SUBSCRIPTIONS_TYPE, MAILBOXES_SECTION_TYPE } from '../constants';
import { createSyncProgressKey } from '../operations/mail/mail-sync';
import {
  getAllMailId,
  getCalendarsPath,
  getDraftsId,
  getMailboxesPath,
  getMailboxesSectionId,
  getSentId,
  getSubscriptionsId,
} from '../paths';
import { syncTarget } from '../util';

const calendarTypename = Type.getTypename(Calendar.Calendar);

const FILTER_TYPE = `${Type.getTypename(Mailbox.Mailbox)}-filter`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
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
        url: { key: 'mail', kind: 'item', path: [Paths.GroupSegments.communications, getMailboxesSectionId()] },
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === MAILBOXES_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const mailboxes = get(space.db.query(Filter.type(Mailbox.Mailbox)).atom);

          return Effect.succeed(
            mailboxes.map((mailbox: Mailbox.Mailbox) => {
              const mailboxSnapshot = get(Obj.atom(mailbox));

              return Node.make({
                id: mailboxSnapshot.id,
                type: Type.getTypename(Mailbox.Mailbox),
                data: mailbox,
                properties: {
                  label: mailboxSnapshot.name ?? ['object-name.placeholder', { ns: Type.getTypename(Mailbox.Mailbox) }],
                  icon: 'ph--tray--regular',
                  iconHue: 'rose',
                  role: 'branch',
                  // Placeholder for a future "intelligent inbox"; resolved by the canonical `systemTag`,
                  // not this label string (see `MailboxArticle`'s `systemTag` prop).
                  filter: '#inbox',
                  systemTag: 'inbox' satisfies SystemTags.SystemTagId,
                },
                nodes: [
                  // Pre-seeded, non-removable filter nodes — same mechanism as a saved user filter, just
                  // static with no rename/delete actions.
                  Node.make({
                    id: getAllMailId(),
                    type: FILTER_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['all-mail.label', { ns: meta.profile.key }],
                      icon: 'ph--tray--regular',
                      iconHue: 'rose',
                      filter: '',
                    },
                  }),
                  Node.make({
                    id: getSentId(),
                    type: FILTER_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['sent.label', { ns: meta.profile.key }],
                      icon: 'ph--paper-plane-tilt--regular',
                      iconHue: 'rose',
                      filter: '#sent',
                      systemTag: 'sent' satisfies SystemTags.SystemTagId,
                    },
                  }),
                  Node.make({
                    id: getDraftsId(),
                    type: FILTER_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['drafts.label', { ns: meta.profile.key }],
                      icon: 'ph--pencil-simple--regular',
                      iconHue: 'rose',
                      filter: '',
                      systemTag: 'draft' satisfies SystemTags.SystemTagId,
                    },
                  }),
                  Node.make({
                    id: getSubscriptionsId(),
                    type: MAILBOX_SUBSCRIPTIONS_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['subscriptions.label', { ns: meta.profile.key }],
                      icon: 'ph--envelope-simple--regular',
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
        id: 'mailboxDraftsActions',
        // Contributes "create draft", scoped to the Drafts view.
        match: (node) =>
          node.properties.systemTag === 'draft' && Mailbox.instanceOf(node.data)
            ? Option.some(node.data)
            : Option.none(),
        actions: (mailbox) => {
          const db = Obj.getDatabase(mailbox);
          if (!db) {
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

      // Every message in a mailbox's feed, plus its in-progress local drafts, as a hidden child of the
      // mailbox node — so `…/mailboxes/<mailboxId>/<messageId>` resolves via the `message` key even
      // though messages aren't enumerated in the nav tree. Each node's data is the message Echo object
      // itself (so it picks up the standard object companions — assistant, properties, info, debug);
      // the surrounding conversation is looked up by `MessageArticle` when the message is opened.
      GraphBuilder.createExtension({
        id: 'mailboxMessages',
        url: { key: 'message', kind: 'item', path: [Paths.GroupSegments.communications, getMailboxesSectionId()] },
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        connector: (mailbox, get) => {
          const db = Obj.getDatabase(mailbox);
          const feed = get(mailbox.feed.atom);
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const feedMessages = get(db.query(Query.select(Filter.type(Message.Message)).from(feed)).atom);
          // Drafts live in the space db, not the feed.
          const draftMessages = get(db.query(Filter.type(Message.Message)).atom).filter((message) =>
            DraftMessage.belongsTo(message, Obj.getURI(mailbox)),
          );

          return Effect.succeed(
            [...feedMessages, ...draftMessages].map((message) =>
              Node.make({
                id: message.id,
                type: Type.getTypename(Message.Message),
                data: message,
                properties: {
                  label: message.properties?.subject ?? ['message.label', { ns: meta.profile.key }],
                  icon: 'ph--envelope-open--regular',
                  disposition: 'hidden',
                },
              }),
            ),
          );
        },
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
        urlKey: 'calendar',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.communications),
        groupSegment: Paths.GroupSegments.communications,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenCreateObject, {
            target: space.db,
            typename: calendarTypename,
            targetNodeId: getCalendarsPath(space.db.spaceId),
          }),
      }),

      // Every event in a calendar's feed, plus its local draft events, as a hidden child of the
      // calendar node — so `…/calendars/<calendarId>/<eventId>` resolves via the `event` key for any
      // deep-link shape.
      GraphBuilder.createExtension({
        id: 'calendarEvents',
        url: { key: 'event', kind: 'item', path: [Paths.GroupSegments.communications, calendarTypename] },
        match: (node) => (Calendar.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        connector: (calendar, get) => {
          const db = Obj.getDatabase(calendar);
          const feed = calendar.feed ? (get(calendar.feed.atom) as Feed.Feed | undefined) : undefined;
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const feedEvents = get(db.query(Query.select(Filter.type(Event.Event)).from(feed)).atom);
          // Draft events live in the space db (not the feed), parented to their calendar.
          const draftEvents = get(db.query(Filter.type(Event.Event)).atom).filter((event) =>
            DraftEvent.belongsTo(event, calendar.id),
          );

          return Effect.succeed(
            [...feedEvents, ...draftEvents].map((event) =>
              Node.make({
                id: event.id,
                type: Type.getTypename(Event.Event),
                data: event,
                properties: {
                  label: event.title ?? ['event.label', { ns: meta.profile.key }],
                  icon: 'ph--calendar-dot--regular',
                  disposition: 'hidden',
                },
              }),
            ),
          );
        },
      }),

      GraphBuilder.createExtension({
        id: 'syncMailbox',
        // Matches every sibling view node (they all share node.data: mailbox), not just the primary.
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (mailbox, get) => {
          const db = Obj.getDatabase(mailbox);
          if (!db) {
            return Effect.succeed([]);
          }
          // The sync action appears only when an external-sync cursor targets this mailbox. The cursor
          // no longer relates to Connection directly, so the Connection is found by matching access
          // tokens (reactive queries; loading synchronously isn't reliable here).
          const cursors = get(db.query(Filter.type(Cursor.Cursor)).atom);
          const cursor = cursors.find(
            (candidate): candidate is Cursor.ExternalCursor =>
              Cursor.isExternal(candidate) && isCursorForTarget(candidate, mailbox),
          );
          if (!cursor) {
            return Effect.succeed([]);
          }
          const [connection] = get(
            db.query(Filter.type(Connection.Connection, { accessToken: cursor.spec.source })).atom,
          );
          if (!connection) {
            return Effect.succeed([]);
          }
          return Effect.gen(function* () {
            // Progress registry is optional (absent when plugin-progress isn't loaded); the same
            // monitor `MailboxArticle`'s statusbar meter reads, so the action's spinner/disabled
            // state agrees with a sync kicked off from either surface or the background routine.
            const progressRegistry = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
            const isSyncing = Option.match(progressRegistry, {
              onNone: () => false,
              onSome: (registry) => get(registry.monitorAtom(createSyncProgressKey(mailbox)))?.status === 'running',
            });
            return [
              {
                id: 'sync',
                data: () => syncTarget(mailbox),
                properties: {
                  label: ['sync-mailbox.label', { ns: meta.profile.key }],
                  icon: isSyncing ? 'ph--spinner-gap--regular' : 'ph--arrows-clockwise--regular',
                  spin: isSyncing,
                  disabled: isSyncing,
                  // Appears both as a primary object-toolbar button and a nav-tree context-menu row.
                  disposition: ['toolbar', 'list-item'],
                  presentation: { toolbar: { variant: 'primary', iconOnly: false } },
                },
              },
            ];
          });
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
          // The sync action appears only when an external-sync cursor targets this calendar; the
          // cursor's `spec.source` access token authenticates the sync.
          const cursors = get(db.query(Filter.type(Cursor.Cursor)).atom);
          const binding = cursors.find(
            (candidate): candidate is Cursor.ExternalCursor =>
              Cursor.isExternal(candidate) && isCursorForTarget(candidate, calendar),
          );
          if (!binding) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'sync',
              data: () => syncTarget(calendar),
              properties: {
                label: ['sync-calendar.label', { ns: meta.profile.key }],
                icon: 'ph--arrows-clockwise--regular',
                // Appears both as a primary object-toolbar button and a nav-tree context-menu row.
                // No progress monitor yet for calendar sync, so (unlike mailbox) there's no spinner.
                disposition: ['toolbar', 'list-item'],
                presentation: { toolbar: { variant: 'primary', iconOnly: false } },
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
