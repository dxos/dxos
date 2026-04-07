//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, getSpaceIdFromPath } from '@dxos/app-toolkit';
import { getLinkedVariant, isLinkedSegment, linkedSegment } from '@dxos/react-ui-attention';
import { type Space, isSpace } from '@dxos/client/echo';
import { type Feed, Filter, Key, Obj, Query } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention/types';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SPACE_TYPE } from '@dxos/plugin-space/types';
import { type Event, Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { meta } from '#meta';
import { InboxOperation } from '#operations';
import { Calendar, DraftMessage, Mailbox } from '#types';

import {
  MAILBOXES_SECTION_TYPE,
  MAILBOX_ALL_MAIL_TYPE,
  MAILBOX_DRAFTS_NODE_DATA,
  MAILBOX_DRAFTS_TYPE,
} from '../constants';
import { getAllMailId, getDraftsId, getMailboxesSectionId } from '../paths';

const FILTER_TYPE = `${Mailbox.Mailbox.typename}-filter`;

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

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
        id: `${meta.id}.mailboxes-section`,
        match: whenSpace,
        connector: (space, get) => {
          const mailboxes = get(AtomQuery.make(space.db, Filter.type(Mailbox.Mailbox)));
          if (mailboxes.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: getMailboxesSectionId(),
              type: MAILBOXES_SECTION_TYPE,
              data: null,
              properties: {
                label: ['mailboxes-section.label', { ns: meta.id }],
                icon: 'ph--tray--regular',
                iconHue: 'neutral',
                role: 'branch',
                position: 'hoist',
                draggable: false,
                droppable: false,
                space,
              },
            },
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.mailbox-listing`,
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === MAILBOXES_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const mailboxes = get(AtomQuery.make(space.db, Filter.type(Mailbox.Mailbox)));

          return Effect.succeed(
            mailboxes.map((mailbox: Mailbox.Mailbox) => {
              return {
                id: mailbox.id,
                type: Mailbox.Mailbox.typename,
                data: null,
                properties: {
                  label: mailbox.name ?? ['object-name.placeholder', { ns: Mailbox.Mailbox.typename }],
                  icon: 'ph--tray--regular',
                  iconHue: 'rose',
                  role: 'branch',
                  mailbox,
                },
                nodes: [
                  {
                    id: getAllMailId(),
                    type: MAILBOX_ALL_MAIL_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['all-mail.label', { ns: meta.id }],
                      icon: 'ph--envelope--regular',
                      iconHue: 'rose',
                      filter: null,
                    },
                  },
                  {
                    id: getDraftsId(),
                    type: MAILBOX_DRAFTS_TYPE,
                    data: MAILBOX_DRAFTS_NODE_DATA,
                    properties: {
                      label: ['drafts.label', { ns: meta.id }],
                      icon: 'ph--pencil-simple--regular',
                      iconHue: 'rose',
                      mailbox,
                    },
                  },
                  ...(mailbox.filters?.map(({ name, filter }: { name: string; filter: any }) => ({
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
                      {
                        id: `filter-${kebabize(name)}-delete`,
                        type: Node.ActionType,
                        data: () =>
                          Effect.sync(() => {
                            const index = mailbox.filters.findIndex((f: any) => f.name === name);
                            Obj.change(mailbox, (mutable: any) => {
                              mutable.filters.splice(index, 1);
                            });
                          }),
                        properties: {
                          label: ['delete-filter.label', { ns: meta.id }],
                          icon: 'ph--trash--regular',
                          disposition: 'list-item',
                        },
                      },
                    ],
                  })) ?? []),
                ],
              };
            }),
          );
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.mailbox-drafts`,
        match: NodeMatcher.whenNodeType(MAILBOX_DRAFTS_TYPE),
        connector: (node, get) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
          if (!mailbox || !db) {
            return Effect.succeed([]);
          }

          const mailboxDxn = Obj.getDXN(mailbox).toString();
          const messageId = get(selectedId(node.id));
          const message = messageId
            ? get(AtomQuery.make<Message.Message>(db, Query.select(Filter.id(messageId))))[0]
            : undefined;
          const draft = message && DraftMessage.belongsTo(message, mailboxDxn) ? message : undefined;
          return Effect.succeed([
            {
              id: linkedSegment('message'),
              type: PLANK_COMPANION_TYPE,
              data: draft ?? 'message',
              properties: {
                label: ['message.label', { ns: meta.id }],
                icon: 'ph--envelope-open--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
        actions: (node) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
          if (!mailbox || !db) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: 'create-draft',
              type: Node.ActionType,
              data: () => Operation.invoke(InboxOperation.DraftEmailAndOpen, { db, mailbox }),
              properties: {
                label: ['create-draft.label', { ns: meta.id }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.mailbox-message`,
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
            {
              id: linkedSegment('message'),
              type: PLANK_COMPANION_TYPE,
              data: message ?? 'message',
              properties: {
                label: ['message.label', { ns: meta.id }],
                icon: 'ph--envelope-open--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),

      // Feed object node extension: creates hidden, navigable nodes for mailbox messages.
      // Uses ~ prefix for attention propagation to the parent mailbox.
      GraphBuilder.createExtension({
        id: `${meta.id}.feed-object-node`,
        match: (node) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          return node.type === Mailbox.Mailbox.typename && mailbox
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
            const mailboxDxn = Obj.getDXN(mailbox).toString();

            // TODO(wittjosiah): This is awkward, clean it up.
            let message: Message.Message | undefined;
            if (feed) {
              message = get(
                AtomQuery.make<Message.Message>(space.db, Query.select(Filter.id(messageId)).from(feed)),
              )[0];
            }
            if (!message) {
              const fromDb = get(AtomQuery.make<Message.Message>(space.db, Query.select(Filter.id(messageId))))[0];
              if (fromDb && DraftMessage.belongsTo(fromDb, mailboxDxn)) {
                message = fromDb;
              }
            }
            if (!message) {
              return null;
            }

            return {
              id: qualifiedId,
              type: Message.Message.typename,
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
        id: `${meta.id}.calendar-event`,
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
            {
              id: linkedSegment('event'),
              type: PLANK_COMPANION_TYPE,
              data: event ?? 'event',
              properties: {
                label: ['event.label', { ns: meta.id }],
                icon: 'ph--calendar-dot--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.sync-mailbox`,
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (mailbox) =>
          Effect.succeed([
            {
              id: 'sync',
              data: () => Operation.invoke(InboxOperation.SyncMailbox, { mailbox }),
              properties: {
                label: ['sync-mailbox.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.sync-calendar`,
        match: (node) => (Calendar.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (calendar) =>
          Effect.succeed([
            {
              id: 'sync',
              data: () => Operation.invoke(InboxOperation.SyncCalendar, { calendar }),
              properties: {
                label: ['sync-calendar.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
