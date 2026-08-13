//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphBuilder from '@dxos/app-graph/GraphBuilder';
import * as Node from '@dxos/app-graph/Node';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import { isSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Feed, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { Connection, Cursor } from '@dxos/link';
import { isCursorForTarget, syncTarget } from '@dxos/plugin-connector';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { DraftMessage, Event, Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';
import { createSyncProgressKey } from '#sync';
import { Calendar, DraftEvent, InboxOperation, Mailbox, SystemTags } from '#types';

import { MAILBOX_SUBSCRIPTIONS_TYPE, MAILBOXES_SECTION_TYPE } from '../constants';
import {
  getAllMailId,
  getCalendarsPath,
  getDraftsId,
  getInboxId,
  getMailboxDraftsPath,
  getMailboxesPath,
  getMailboxesSectionId,
  getSentId,
  getStarredId,
  getSubscriptionsId,
} from '../paths';
import { getMessageLabel } from '../util';

const calendarTypename = Type.getTypename(Calendar.Calendar);

/**
 * Whether an external sync connection targets this mailbox. Gates the pipeline actions: with nothing
 * connected there is no mail to act on, so offering them is a dead affordance. Mirrors the lookup the
 * sync action does — the cursor no longer relates to a Connection directly, so the Connection is found
 * by matching access tokens.
 */
const hasConnection = (mailbox: Mailbox.Mailbox, get: Atom.AtomContext): boolean => {
  const db = Obj.getDatabase(mailbox);
  if (!db) {
    return false;
  }
  const cursor = get(db.query(Filter.type(Cursor.Cursor)).atom).find(
    (candidate): candidate is Cursor.ExternalCursor =>
      Cursor.isExternal(candidate) && isCursorForTarget(candidate, mailbox),
  );
  if (!cursor) {
    return false;
  }
  return get(db.query(Filter.type(Connection.Connection, { accessToken: cursor.spec.source })).atom).length > 0;
};

const FILTER_TYPE = `${Type.getTypename(Mailbox.Mailbox)}-filter`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'mailboxesSection',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.communications),
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
        url: { key: 'mail', kind: 'item', path: [GraphPath.GroupSegments.communications, getMailboxesSectionId()] },
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
                    id: getInboxId(),
                    type: FILTER_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['inbox.label', { ns: meta.profile.key }],
                      icon: 'ph--tray--regular',
                      iconHue: 'rose',
                      // Gmail/JMAP both model the inbox as positive membership (Gmail's INBOX label,
                      // JMAP's inbox role), so archiving removes this tag rather than adding one —
                      // no complement operator is needed here or in `MailboxArticle`.
                      filter: '#inbox',
                      systemTag: 'inbox' satisfies SystemTags.SystemTagId,
                    },
                  }),
                  Node.make({
                    id: getStarredId(),
                    type: FILTER_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['starred.label', { ns: meta.profile.key }],
                      icon: 'ph--star--regular',
                      iconHue: 'rose',
                      filter: '#starred',
                      systemTag: 'starred' satisfies SystemTags.SystemTagId,
                    },
                  }),
                  Node.make({
                    id: getAllMailId(),
                    type: FILTER_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['all-mail.label', { ns: meta.profile.key }],
                      icon: 'ph--stack--regular',
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
              data: () =>
                Operation.invoke(InboxOperation.DraftEmailAndOpen, {
                  db,
                  mailbox,
                  // This action hangs off the Drafts view, so the draft opens as a plank beside it.
                  contextId: getMailboxDraftsPath(db.spaceId, mailbox.id),
                }),
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
        url: { key: 'message', kind: 'item', path: [GraphPath.GroupSegments.communications, getMailboxesSectionId()] },
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
                  label: getMessageLabel(message),
                  icon: DraftMessage.instanceOf(message) ? 'ph--pencil-simple--regular' : 'ph--envelope-open--regular',
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
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.communications),
        groupSegment: GraphPath.GroupSegments.communications,
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
        url: { key: 'event', kind: 'item', path: [GraphPath.GroupSegments.communications, calendarTypename] },
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
                  // The toolbar emits `data-testid` only for actions that set one; browser-e2e waits on it.
                  testId: 'inbox.mailbox.sync',
                },
              },
            ];
          });
        },
      }),

      GraphBuilder.createExtension({
        id: 'processMailbox',
        // Matches every sibling view node (they all share node.data: mailbox), not just the primary.
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (mailbox, get) => {
          const db = Obj.getDatabase(mailbox);
          // Gated on a connection, not rendered disabled: a disabled primary button still reads as the
          // view's main call to action on a mailbox that has nothing to enrich yet.
          if (!db || !hasConnection(mailbox, get)) {
            return Effect.succeed([]);
          }
          return Effect.gen(function* () {
            // Same monitor MailboxArticle's statusbar meter reads, so the button's stop state agrees
            // with a run kicked off from either surface (or a routine).
            const progressRegistry = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
            const progressKey = InboxOperation.createProcessProgressKey(mailbox);
            const isRunning = Option.match(progressRegistry, {
              onNone: () => false,
              onSome: (registry) => get(registry.monitorAtom(progressKey))?.status === 'running',
            });
            const enrichKey = InboxOperation.createEnrichProgressKey(mailbox);
            const isEnriching = Option.match(progressRegistry, {
              onNone: () => false,
              onSome: (registry) => get(registry.monitorAtom(enrichKey))?.status === 'running',
            });
            return [
              {
                // The pipeline cascade the user runs by hand after a first sync: deterministic
                // extraction, then cheap LLM labelling. Each spawned tier keeps its own cursor, so
                // a repeat run catches up rather than redoing the mailbox.
                id: 'enrich',
                data: () =>
                  isEnriching
                    ? Effect.sync(() => Option.getOrUndefined(progressRegistry)?.cancel(enrichKey))
                    : // Scheduled (not invoked): the cascade is a long run the meter/stop can cancel
                      // between tiers.
                      Operation.schedule(
                        InboxOperation.EnrichMailbox,
                        { mailbox: Ref.make(mailbox), me: Mailbox.identityAddresses(mailbox) },
                        { spaceId: db.spaceId },
                      ),
                properties: {
                  label: isEnriching
                    ? ['stop-enrich-mailbox.label', { ns: meta.profile.key }]
                    : ['enrich-mailbox.label', { ns: meta.profile.key }],
                  icon: isEnriching ? 'ph--stop--regular' : 'ph--stack-simple--regular',
                  disposition: ['toolbar', 'list-item'],
                  presentation: { toolbar: { variant: 'primary', iconOnly: false } },
                  testId: 'inbox.mailbox.enrich',
                },
              },
              {
                // The cursored walking-skeleton pipeline. Kept out of the toolbar (`enrich` is the
                // single pipeline trigger) but reachable from the context menu, since its durable
                // cursor plus `resetProcessCursor` are what the cursor machinery is verified through.
                id: 'process',
                data: () =>
                  isRunning
                    ? // Cancel routes through the progress trace sink, terminating the emitting process.
                      Effect.sync(() => Option.getOrUndefined(progressRegistry)?.cancel(progressKey))
                    : // Scheduled (not invoked) so the run is a real process the meter/stop can cancel.
                      Operation.schedule(
                        InboxOperation.ProcessMailbox,
                        { mailbox: Ref.make(mailbox) },
                        { spaceId: db.spaceId },
                      ),
                properties: {
                  label: isRunning
                    ? ['stop-process-mailbox.label', { ns: meta.profile.key }]
                    : ['process-mailbox.label', { ns: meta.profile.key }],
                  icon: isRunning ? 'ph--stop--regular' : 'ph--play--regular',
                  disposition: ['list-item'],
                  testId: 'inbox.mailbox.process',
                },
              },
              {
                id: 'resetProcessCursor',
                data: () =>
                  Operation.invoke(
                    InboxOperation.ResetProcessCursor,
                    { mailbox: Ref.make(mailbox) },
                    { spaceId: db.spaceId },
                  ).pipe(Effect.asVoid),
                properties: {
                  label: ['reset-process-cursor.label', { ns: meta.profile.key }],
                  icon: 'ph--arrow-counter-clockwise--regular',
                  // Context menu only; disabled mid-run so a reset never races the advancing cursor.
                  disposition: ['list-item'],
                  disabled: isRunning,
                  testId: 'inbox.mailbox.processReset',
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
