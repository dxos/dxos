//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createObjectNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { type Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { AtomObj, AtomQuery, AtomRef } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SPACE_TYPE } from '@dxos/plugin-space/types';
import { type Event, Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { MAILBOXES_SECTION_TYPE, MAILBOX_ALL_MAIL_TYPE, MAILBOX_DRAFTS_TYPE } from '../../constants';
import { CalendarFunctions, GmailFunctions } from '../../functions';
import { meta } from '../../meta';
import { Calendar, InboxOperation, Mailbox } from '../../types';

const FILTER_TYPE = `${Mailbox.Mailbox.typename}-filter`;

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

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
        id: `${meta.id}/mailboxes-section`,
        match: whenSpace,
        connector: (space, get) => {
          const mailboxes = get(AtomQuery.make(space.db, Filter.type(Mailbox.Mailbox)));
          if (mailboxes.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: `${space.id}-mailboxes`,
              type: MAILBOXES_SECTION_TYPE,
              data: null,
              properties: {
                label: ['mailboxes section label', { ns: meta.id }],
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
        id: `${meta.id}/mailbox-listing`,
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === MAILBOXES_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const mailboxes = get(AtomQuery.make(space.db, Filter.type(Mailbox.Mailbox)));

          return Effect.succeed(
            mailboxes.map((mailbox: Mailbox.Mailbox) => {
              const mailboxDxn = Obj.getDXN(mailbox).toString();
              return {
                id: `${mailboxDxn}-mailbox`,
                type: Mailbox.Mailbox.typename,
                data: null,
                properties: {
                  label: mailbox.name ?? ['object name placeholder', { ns: Mailbox.Mailbox.typename }],
                  icon: 'ph--tray--regular',
                  iconHue: 'rose',
                  role: 'branch',
                  mailbox,
                },
                nodes: [
                  {
                    id: `${mailboxDxn}-all-mail`,
                    type: MAILBOX_ALL_MAIL_TYPE,
                    data: mailbox,
                    properties: {
                      label: ['all mail label', { ns: meta.id }],
                      icon: 'ph--envelope--regular',
                      iconHue: 'rose',
                      filter: null,
                    },
                  },
                  {
                    id: `${mailboxDxn}-drafts`,
                    type: MAILBOX_DRAFTS_TYPE,
                    data: null,
                    properties: {
                      label: ['drafts label', { ns: meta.id }],
                      icon: 'ph--pencil-simple--regular',
                      iconHue: 'rose',
                      role: 'branch',
                      mailbox,
                    },
                  },
                  ...(mailbox.filters?.map(({ name, filter }: { name: string; filter: any }) => ({
                    id: `${mailboxDxn}-filter-${kebabize(name)}`,
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
                        id: `${mailboxDxn}-filter-${kebabize(name)}-delete`,
                        type: Node.ActionType,
                        data: Effect.fnUntraced(function* () {
                          const index = mailbox.filters.findIndex((f: any) => f.name === name);
                          Obj.change(mailbox, (mutable: any) => {
                            mutable.filters.splice(index, 1);
                          });
                        }),
                        properties: {
                          label: ['delete filter label', { ns: meta.id }],
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
        id: `${meta.id}/mailbox-drafts`,
        match: NodeMatcher.whenNodeType(MAILBOX_DRAFTS_TYPE),
        connector: (node, get) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
          if (!mailbox || !db) {
            return Effect.succeed([]);
          }

          const mailboxDxn = Obj.getDXN(mailbox).toString();
          const allMessages = get(AtomQuery.make(db, Filter.type(Message.Message)));
          const drafts = allMessages.filter((message) => {
            get(AtomObj.make(message));
            return message.properties?.mailbox === mailboxDxn;
          });

          return Effect.succeed(
            drafts
              .map((draft: Message.Message) => createObjectNode({ db, object: draft, resolve, disposition: undefined }))
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
        actions: (node) => {
          const mailbox = node.properties.mailbox as Mailbox.Mailbox | undefined;
          const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
          if (!mailbox || !db) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: `${Obj.getDXN(mailbox).toString()}-create-draft`,
              type: Node.ActionType,
              data: () => Operation.invoke(InboxOperation.CreateDraft, { db, mailbox }),
              properties: {
                label: ['create draft label', { ns: meta.id }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/mailbox-message`,
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        connector: (mailbox, get) => {
          const db = Obj.getDatabase(mailbox);
          const feed = mailbox.feed ? (get(AtomRef.make(mailbox.feed)) as Feed.Feed | undefined) : undefined;
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const nodeId = Obj.getDXN(mailbox).toString();
          const messageId = get(selectedId(nodeId));
          const message = get(
            AtomQuery.make<Message.Message>(
              db,
              Query.select(messageId ? Filter.id(messageId) : Filter.nothing()).from(feed),
            ),
          )[0];
          return Effect.succeed([
            {
              id: `${nodeId}${ATTENDABLE_PATH_SEPARATOR}message`,
              type: PLANK_COMPANION_TYPE,
              data: message ?? 'message',
              properties: {
                label: ['message label', { ns: meta.id }],
                icon: 'ph--envelope-open--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/calendar-event`,
        match: (node) => (Calendar.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        connector: (calendar, get) => {
          const db = Obj.getDatabase(calendar);
          const feed = calendar.feed ? (get(AtomRef.make(calendar.feed)) as Feed.Feed | undefined) : undefined;
          if (!db || !feed) {
            return Effect.succeed([]);
          }

          const nodeId = Obj.getDXN(calendar).toString();
          const eventId = get(selectedId(nodeId));
          const event = get(
            AtomQuery.make<Event.Event>(db, Query.select(eventId ? Filter.id(eventId) : Filter.nothing()).from(feed)),
          )[0];
          return Effect.succeed([
            {
              id: `${nodeId}${ATTENDABLE_PATH_SEPARATOR}event`,
              type: PLANK_COMPANION_TYPE,
              data: event ?? 'event',
              properties: {
                label: ['event label', { ns: meta.id }],
                icon: 'ph--calendar-dot--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/sync-mailbox`,
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (mailbox) =>
          Effect.succeed([
            {
              id: `${Obj.getDXN(mailbox).toString()}-sync`,
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(mailbox);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    invokeFunctionWithTracing(GmailFunctions.Sync, {
                      mailbox: Ref.make(mailbox),
                    }),
                  ),
                );
              }),
              properties: {
                label: ['sync mailbox label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/sync-calendar`,
        match: (node) => (Calendar.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (calendar) =>
          Effect.succeed([
            {
              id: `${Obj.getDXN(calendar).toString()}-sync`,
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(calendar);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    invokeFunctionWithTracing(CalendarFunctions.Sync, {
                      calendar: Ref.make(calendar),
                    }),
                  ),
                );
              }),
              properties: {
                label: ['sync calendar label', { ns: meta.id }],
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
