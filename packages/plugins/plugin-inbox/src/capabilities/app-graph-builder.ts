//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, getSpaceIdFromPath } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { type Feed, Filter, Key, Obj, Query, Ref, Type } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { EchoURI } from '@dxos/keys';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { Integration } from '@dxos/plugin-integration';
import { getLinkedVariant, isLinkedSegment, linkedSegment } from '@dxos/react-ui-attention';
import { type Event, Message } from '@dxos/types';
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

const FILTER_TYPE = `${Type.getTypename(Mailbox.Mailbox)}-filter`;

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

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'mailboxes-section',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const mailboxes = get(AtomQuery.make(space.db, Filter.type(Mailbox.Mailbox)));
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
        id: 'mailbox-listing',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === MAILBOXES_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const mailboxes = get(AtomQuery.make(space.db, Filter.type(Mailbox.Mailbox)));

          return Effect.succeed(
            mailboxes.map((mailbox: Mailbox.Mailbox) => {
              return Node.make({
                id: mailbox.id,
                type: Type.getTypename(Mailbox.Mailbox),
                data: null,
                properties: {
                  label: mailbox.name ?? ['object-name.placeholder', { ns: Type.getTypename(Mailbox.Mailbox) }],
                  icon: 'ph--tray--regular',
                  iconHue: 'rose',
                  role: 'branch',
                  mailbox,
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
                  ...(mailbox.filters?.map(({ name, filter }: { name: string; filter: any }) =>
                    Node.make({
                      id: `filter-${kebabize(name)}`,
                      type: FILTER_TYPE,
                      data: mailbox,
                      properties: {
                        label: name,
                        icon: 'ph--funnel--regular',
                        iconHue: 'neutral',
                        filter,
                      },
                      nodes: [
                        Node.makeAction({
                          id: `filter-${kebabize(name)}-delete`,
                          data: () =>
                            Effect.sync(() => {
                              const index = mailbox.filters.findIndex((f: any) => f.name === name);
                              Obj.update(mailbox, (mailbox: any) => {
                                mailbox.filters.splice(index, 1);
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
        id: 'mailbox-drafts',
        match: NodeMatcher.whenNodeType(MAILBOX_DRAFTS_TYPE),
        connector: (node, get) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
          if (!mailbox || !db) {
            return Effect.succeed([]);
          }

          const mailboxUri = Obj.getURI(mailbox);
          const messageId = get(selectedId(node.id));
          const message = messageId
            ? get(AtomQuery.make<Message.Message>(db, Query.select(Filter.id(messageId))))[0]
            : undefined;
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
              id: 'create-draft',
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
        id: 'mailbox-message',
        match: (node) =>
          Mailbox.instanceOf(node.data) ? Option.some({ mailbox: node.data, nodeId: node.id }) : Option.none(),
        connector: (matched, get) => {
          const mailbox = matched.mailbox;
          const db = Obj.getDatabase(mailbox);
          const feed = mailbox.feed ? (get(AtomRef.make(mailbox.feed)) as Feed.Feed | undefined) : undefined;
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const messageId = get(selectedId(matched.nodeId));
          const message = get(
            AtomQuery.make<Message.Message>(
              db,
              Query.select(messageId ? Filter.id(messageId) : Filter.nothing()).from(feed),
            ),
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
        id: 'feed-object-node',
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

            if (!spaceId || !mailboxId || !Key.ObjectId.isValid(messageId)) {
              return null;
            }

            const client = yield* Capability.get(ClientCapabilities.Client);
            const space = client.spaces.get(spaceId);
            if (!space) {
              return null;
            }

            const mailboxes = get(AtomQuery.make(space.db, Filter.type(Mailbox.Mailbox)));
            const mailbox = mailboxes.find((m: Mailbox.Mailbox) => m.id === mailboxId);
            if (!mailbox) {
              return null;
            }

            const feed = mailbox.feed ? (get(AtomRef.make(mailbox.feed)) as Feed.Feed | undefined) : undefined;
            const mailboxUri = Obj.getURI(mailbox);

            // TODO(wittjosiah): This is awkward, clean it up.
            let message: Message.Message | undefined;
            if (feed) {
              message = get(
                AtomQuery.make<Message.Message>(space.db, Query.select(Filter.id(messageId)).from(feed)),
              )[0];
            }
            if (!message) {
              const fromDb = get(AtomQuery.make<Message.Message>(space.db, Query.select(Filter.id(messageId))))[0];
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

      GraphBuilder.createExtension({
        id: 'calendar-event',
        match: (node) =>
          Calendar.instanceOf(node.data) ? Option.some({ calendar: node.data, nodeId: node.id }) : Option.none(),
        connector: (matched, get) => {
          const calendar = matched.calendar;
          const db = Obj.getDatabase(calendar);
          const feed = calendar.feed ? (get(AtomRef.make(calendar.feed)) as Feed.Feed | undefined) : undefined;
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const eventId = get(selectedId(matched.nodeId));
          const event = get(
            AtomQuery.make<Event.Event>(db, Query.select(eventId ? Filter.id(eventId) : Filter.nothing()).from(feed)),
          )[0];
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
        id: 'sync-mailbox',
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (mailbox, get) => {
          const db = Obj.getDatabase(mailbox);
          if (!db) {
            return Effect.succeed([]);
          }
          const integrations = get(AtomQuery.make(db, Filter.type(Integration.Integration)));
          const integration = integrations.find((integration) =>
            integration.targets.some(
              (target) => target.object && EchoURI.getObjectId(EchoURI.tryParse(target.object.uri)!) === mailbox.id,
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
        id: 'sync-calendar',
        match: (node) => (Calendar.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (calendar, get) => {
          const db = Obj.getDatabase(calendar);
          if (!db) {
            return Effect.succeed([]);
          }
          const integrations = get(AtomQuery.make(db, Filter.type(Integration.Integration)));
          const integration = integrations.find((integration) =>
            integration.targets.some(
              (target) => target.object && EchoURI.getObjectId(EchoURI.tryParse(target.object.uri)!) === calendar.id,
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
