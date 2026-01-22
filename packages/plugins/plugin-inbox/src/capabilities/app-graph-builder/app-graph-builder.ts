//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Filter, Obj, type QueryResult, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder, Node } from '@dxos/plugin-graph';
import { atomFromQuery } from '@dxos/plugin-space';
import { type Event, type Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { calendar, gmail } from '../../functions';
import { meta } from '../../meta';
import { Calendar, Mailbox } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}/mailbox-filters`,
        match: (node) =>
          Obj.instanceOf(Mailbox.Mailbox, node.data) &&
          node.data.filters?.length > 0 &&
          node.properties.filter === undefined
            ? Option.some(node.data)
            : Option.none(),
        connector: (mailbox, get) =>
          Effect.succeed(
            get(
              CreateAtom.fromSignal(() => [
                {
                  id: `${Obj.getDXN(mailbox).toString()}-unfiltered`,
                  type: `${Mailbox.Mailbox.typename}-filter`,
                  data: mailbox,
                  properties: {
                    label: ['inbox label', { ns: meta.id }],
                    icon: 'ph--tray--regular',
                    filter: null,
                  },
                },
                ...mailbox.filters?.map(({ name, filter }: { name: string; filter: any }) => ({
                  id: `${Obj.getDXN(mailbox).toString()}-filter-${kebabize(name)}`,
                  type: `${Mailbox.Mailbox.typename}-filter`,
                  data: mailbox,
                  properties: {
                    label: name,
                    icon: 'ph--tray--regular',
                    filter,
                  },
                  nodes: [
                    {
                      id: `${Obj.getDXN(mailbox).toString()}-filter-${kebabize(name)}-delete`,
                      type: Node.ActionType,
                      data: Effect.fnUntraced(function* () {
                        const index = mailbox.filters.findIndex((f: any) => f.name === name);
                        Obj.change(mailbox, (m) => {
                          m.filters.splice(index, 1);
                        });
                      }),
                      properties: {
                        label: ['delete filter label', { ns: meta.id }],
                        icon: 'ph--trash--regular',
                        disposition: 'list-item',
                      },
                    },
                  ],
                })),
              ]),
            ),
          ),
      }),
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/mailbox-message`,
        type: Mailbox.Mailbox,
        connector: (mailbox, get) => {
          const queue = get(CreateAtom.fromSignal(() => mailbox.queue.target));
          if (!queue) {
            return Effect.succeed([]);
          }

          const selectionManager = capabilities.get(AttentionCapabilities.Selection);
          const nodeId = Obj.getDXN(mailbox).toString();
          const messageId = get(
            Atom.make((get) => {
              const state = get(selectionManager.stateAtom);
              const selection = state.selections[nodeId];
              return selection?.mode === 'single' ? selection.id : undefined;
            }),
          );
          const query = queue.query(
            messageId ? Filter.id(messageId) : Filter.nothing(),
          ) as QueryResult.QueryResult<Message.Message>;
          const message = get(atomFromQuery(query))[0];
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
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/calendar-event`,
        type: Calendar.Calendar,
        connector: (calendar, get) => {
          const queue = get(CreateAtom.fromSignal(() => calendar.queue.target));
          if (!queue) {
            return Effect.succeed([]);
          }

          const selectionManager = capabilities.get(AttentionCapabilities.Selection);
          const nodeId = Obj.getDXN(calendar).toString();
          const eventId = get(
            Atom.make((get) => {
              const state = get(selectionManager.stateAtom);
              const selection = state.selections[nodeId];
              return selection?.mode === 'single' ? selection.id : undefined;
            }),
          );
          const query = queue.query(
            eventId ? Filter.id(eventId) : Filter.nothing(),
          ) as QueryResult.QueryResult<Event.Event>;
          const event = get(atomFromQuery(query))[0];
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
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/sync-mailbox`,
        type: Mailbox.Mailbox,
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
                  runtime.runPromise(invokeFunctionWithTracing(gmail.sync, { mailbox: Ref.make(mailbox) })),
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
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/sync-calendar`,
        type: Calendar.Calendar,
        actions: (calendarObj) =>
          Effect.succeed([
            {
              id: `${Obj.getDXN(calendarObj).toString()}-sync`,
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(calendarObj);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    invokeFunctionWithTracing(calendar.sync, { calendarId: Obj.getDXN(calendarObj).toString() }),
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

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
