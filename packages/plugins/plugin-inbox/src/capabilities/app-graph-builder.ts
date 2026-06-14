//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  AppNode,
  AppNodeMatcher,
  createTypeSectionExtension,
  getSpaceIdFromPath,
} from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { type Feed, Filter, Key, Obj, Query, Ref, Type } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { Integration } from '@dxos/plugin-integration';
import { SpaceOperation } from '@dxos/plugin-space';
import { getLinkedVariant, isLinkedSegment, linkedSegment, selectionSlice } from '@dxos/react-ui-attention';
import { Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';
import { InboxOperation } from '#types';
import { Calendar, DraftMessage, Mailbox } from '#types';

import {
  MAILBOXES_SECTION_TYPE,
  MAILBOX_ALL_MAIL_TYPE,
  MAILBOX_DRAFTS_NODE_DATA,
  MAILBOX_DRAFTS_TYPE,
} from '../constants';
import { getAllMailId, getDraftsId, getMailboxesSectionId } from '../paths';

const calendarTypename = Type.getTypename(Calendar.Calendar);

const FILTER_TYPE = `${Type.getTypename(Mailbox.Mailbox)}-filter`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
    // Derive a single-mode selected id per context from the ViewStateManager selection slice.
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const selection = get(viewState.atom(selectionSlice, nodeId));
        return selection.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'mailboxesSection',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const mailboxes = get(space.db.query(Filter.type(Mailbox.Mailbox)).atom);
          if (mailboxes.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeSection({
              id: getMailboxesSectionId(),
              type: MAILBOXES_SECTION_TYPE,
              label: ['mailboxes-section.label', { ns: meta.id }],
              icon: 'ph--tray--regular',
              iconHue: 'rose',
              space,
              position: 'first',
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
                ? get(space.db.query(Query.select(Filter.type(Message.Message)).from(feed)).atom)
                : [];
              const modifiedCount = Mailbox.getNewMessageCount(mailboxSnapshot, messages);

              return Node.make({
                id: mailboxSnapshot.id,
                type: Type.getTypename(Mailbox.Mailbox),
                data: null,
                properties: {
                  label: mailboxSnapshot.name ?? ['object-name.placeholder', { ns: Type.getTypename(Mailbox.Mailbox) }],
                  icon: 'ph--tray--regular',
                  iconHue: 'rose',
                  role: 'branch',
                  mailbox,
                  modifiedCount,
                },
                nodes: [
                  Node.make({
                    id: getAllMailId(),
                    type: MAILBOX_ALL_MAIL_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['all-mail.label', { ns: meta.id }],
                      icon: 'ph--envelope--regular',
                      iconHue: 'rose',
                      filter: null,
                    },
                  }),
                  Node.make({
                    id: getDraftsId(),
                    type: MAILBOX_DRAFTS_TYPE,
                    data: MAILBOX_DRAFTS_NODE_DATA,
                    properties: {
                      label: ['drafts.label', { ns: meta.id }],
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
                        iconHue: 'blue',
                        filter,
                      },
                      nodes: [
                        Node.makeAction({
                          id: `filter-${kebabize(name)}-delete`,
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
                            label: ['delete-filter.label', { ns: meta.id }],
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
              label: ['message.label', { ns: meta.id }],
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
                label: ['create-draft.label', { ns: meta.id }],
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
          const message = get(
            db.query(Query.select(messageId ? Filter.id(messageId) : Filter.nothing()).from(feed)).atom,
          )[0];
          return Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('message'),
              label: ['message.label', { ns: meta.id }],
              icon: 'ph--envelope-open--regular',
              data: message ?? 'message',
            }),
          ]);
        },
      }),

      // Feed object node extension: creates hidden, navigable nodes for mailbox messages.
      // Uses ~ prefix for attention propagation to the parent mailbox.
      GraphBuilder.createExtension({
        id: 'feedObjectNode',
        match: (node) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          return node.type === Type.getTypename(Mailbox.Mailbox) && mailbox
            ? Option.some({ mailbox, nodeId: node.id })
            : Option.none();
        },
        resolver: (qualifiedId, get) =>
          Effect.gen(function* () {
            const segments = qualifiedId.split('/');
            if (!isLinkedSegment(qualifiedId)) {
              return null;
            }

            const messageId = getLinkedVariant(qualifiedId);
            const spaceId = getSpaceIdFromPath(qualifiedId);
            const mailboxesIdx = segments.indexOf(getMailboxesSectionId());
            const mailboxId = mailboxesIdx >= 0 ? segments[mailboxesIdx + 1] : undefined;

            if (!spaceId || !mailboxId || !Key.EntityId.isValid(messageId)) {
              return null;
            }

            const client = yield* Capability.get(ClientCapabilities.Client);
            const space = client.spaces.get(spaceId);
            if (!space) {
              return null;
            }

            const mailboxes = get(space.db.query(Filter.type(Mailbox.Mailbox)).atom);
            const mailbox = mailboxes.find((m: Mailbox.Mailbox) => m.id === mailboxId);
            if (!mailbox) {
              return null;
            }

            const feed = mailbox.feed ? (get(mailbox.feed.atom) as Feed.Feed | undefined) : undefined;
            const mailboxUri = Obj.getURI(mailbox);

            // TODO(wittjosiah): This is awkward, clean it up.
            let message: Message.Message | undefined;
            if (feed) {
              message = get(space.db.query(Query.select(Filter.id(messageId)).from(feed)).atom)[0];
            }
            if (!message) {
              const fromDb = get(space.db.query(Query.select(Filter.id(messageId))).atom)[0];
              if (fromDb && DraftMessage.belongsTo(fromDb, mailboxUri)) {
                message = fromDb;
              }
            }
            if (!message) {
              return null;
            }

            return {
              id: qualifiedId,
              type: Type.getTypename(Message.Message),
              data: message,
              properties: {
                label: message.properties?.subject ?? ['message.label', { ns: meta.id }],
                icon: 'ph--envelope-open--regular',
                disposition: 'hidden',
              },
            };
          }),
      }),

      createTypeSectionExtension(Calendar.Calendar),

      GraphBuilder.createExtension({
        id: 'calendarsSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === calendarTypename && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-calendar',
              data: () =>
                Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: space.db,
                  typename: calendarTypename,
                }),
              properties: {
                label: ['add-object.label', { ns: calendarTypename }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
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
          return Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('event'),
              label: ['event.label', { ns: meta.id }],
              icon: 'ph--calendar-dot--regular',
              data: event ?? 'event',
            }),
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: 'syncMailbox',
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (mailbox, get) => {
          const db = Obj.getDatabase(mailbox);
          if (!db) {
            return Effect.succeed([]);
          }
          const integrations = get(db.query(Filter.type(Integration.Integration)).atom);
          const integration = integrations.find((integration) =>
            integration.targets.some(
              (target) => target.object && EID.getEntityId(EID.tryParse(target.object.uri)!) === mailbox.id,
            ),
          );
          if (!integration) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'sync',
              data: () =>
                Operation.invoke(
                  InboxOperation.GoogleMailSync,
                  {
                    integration: Ref.make(integration),
                    mailbox: Ref.make(mailbox),
                  },
                  {
                    spaceId: db.spaceId,
                    notify: {
                      success: ['sync-mailbox-success.title', { ns: meta.id }],
                      error: ['sync-mailbox-error.title', { ns: meta.id }],
                    },
                  },
                ),
              properties: {
                label: ['sync-mailbox.label', { ns: meta.id }],
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
          const integrations = get(db.query(Filter.type(Integration.Integration)).atom);
          const integration = integrations.find((integration) =>
            integration.targets.some(
              (target) => target.object && EID.getEntityId(EID.tryParse(target.object.uri)!) === calendar.id,
            ),
          );
          if (!integration) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'sync',
              data: () =>
                Operation.invoke(
                  InboxOperation.GoogleCalendarSync,
                  {
                    integration: Ref.make(integration),
                    calendar: Ref.make(calendar),
                  },
                  {
                    spaceId: db.spaceId,
                    notify: {
                      success: ['sync-calendar-success.title', { ns: meta.id }],
                      error: ['sync-calendar-error.title', { ns: meta.id }],
                    },
                  },
                ),
              properties: {
                label: ['sync-calendar.label', { ns: meta.id }],
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
