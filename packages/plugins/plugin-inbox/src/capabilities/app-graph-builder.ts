//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { Filter, Obj, type QueryResult, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, Graph, GraphBuilder } from '@dxos/plugin-graph';
import { atomFromQuery } from '@dxos/plugin-space';
import { type Event, type Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { calendar, gmail } from '../functions';
import { meta } from '../meta';
import { Calendar, Mailbox } from '../types';

export default defineCapabilityModule((context: PluginContext) => {
  return contributes(Capabilities.AppGraphBuilder, [
    GraphBuilder.createExtension({
      id: `${meta.id}/mailbox-filters`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Mailbox.Mailbox, node.data) &&
              node.data.filters?.length > 0 &&
              node.properties.filter === undefined
                ? Option.some(node.data)
                : Option.none(),
            ),
            Option.map((mailbox) =>
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
                  ...mailbox.filters?.map(({ name, filter }) => ({
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
                        type: Graph.ACTION_TYPE,
                        data: async () => {
                          const index = mailbox.filters.findIndex((f) => f.name === name);
                          mailbox.filters.splice(index, 1);
                        },
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
            Option.getOrElse(() => []),
          ),
        ),
    }),
    GraphBuilder.createExtension({
      id: `${meta.id}/mailbox-message`,
      connector: (node) => {
        let prevMessageId: string | undefined;
        let query: QueryResult.QueryResult<Message.Message> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => {
              if (!Obj.instanceOf(Mailbox.Mailbox, node.data)) {
                return Option.none();
              }

              const queue = get(CreateAtom.fromSignal(() => node.data.queue.target));
              if (!queue) {
                return Option.none();
              }

              return Option.some({ nodeId: node.id, queue });
            }),
            Option.map(({ nodeId, queue }) => {
              const selection = get(context.capabilities(AttentionCapabilities.Selection))[0];
              const messageId = get(CreateAtom.fromSignal(() => selection?.getSelected(nodeId, 'single')));
              if (!query || prevMessageId !== messageId) {
                prevMessageId = messageId;
                query = queue.query(
                  messageId ? Filter.id(messageId) : Filter.nothing(),
                ) as QueryResult.QueryResult<Message.Message>;
              }

              const message = get(atomFromQuery(query))[0];
              return [
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
              ];
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),
    GraphBuilder.createExtension({
      id: `${meta.id}/calendar-event`,
      connector: (node) => {
        let prevEventId: string | undefined;
        let query: QueryResult.QueryResult<Event.Event> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => {
              if (!Obj.instanceOf(Calendar.Calendar, node.data)) {
                return Option.none();
              }

              const queue = get(CreateAtom.fromSignal(() => node.data.queue.target));
              if (!queue) {
                return Option.none();
              }

              return Option.some({ nodeId: node.id, queue });
            }),
            Option.map(({ nodeId, queue }) => {
              const selection = get(context.capabilities(AttentionCapabilities.Selection))[0];
              const eventId = get(CreateAtom.fromSignal(() => selection?.getSelected(nodeId, 'single')));
              if (!query || prevEventId !== eventId) {
                prevEventId = eventId;
                query = queue.query(
                  eventId ? Filter.id(eventId) : Filter.nothing(),
                ) as QueryResult.QueryResult<Event.Event>;
              }

              const event = get(atomFromQuery(query))[0];
              return [
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
              ];
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),
    GraphBuilder.createExtension({
      id: `${meta.id}/sync-mailbox`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Mailbox.Mailbox, node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((mailbox) =>
              get(
                CreateAtom.fromSignal(() => [
                  {
                    id: `${Obj.getDXN(mailbox).toString()}-sync`,
                    type: Graph.ACTION_TYPE,
                    data: async () => {
                      const db = Obj.getDatabase(mailbox);
                      invariant(db);
                      const computeRuntime = context.getCapability(AutomationCapabilities.ComputeRuntime);
                      const runtime = computeRuntime.getRuntime(db.spaceId);
                      await runtime.runPromise(invokeFunctionWithTracing(gmail.sync, { mailbox: Ref.make(mailbox) }));
                    },
                    properties: {
                      label: ['sync mailbox label', { ns: meta.id }],
                      icon: 'ph--arrows-clockwise--regular',
                      disposition: 'list-item',
                    },
                  },
                ]),
              ),
            ),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    GraphBuilder.createExtension({
      id: `${meta.id}/sync-calendar`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Calendar.Calendar, node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((object) =>
              get(
                CreateAtom.fromSignal(() => [
                  {
                    id: `${Obj.getDXN(object).toString()}-sync`,
                    type: Graph.ACTION_TYPE,
                    data: async () => {
                      const db = Obj.getDatabase(object);
                      invariant(db);
                      const computeRuntime = context.getCapability(AutomationCapabilities.ComputeRuntime);
                      const runtime = computeRuntime.getRuntime(db.spaceId);
                      await runtime.runPromise(
                        invokeFunctionWithTracing(calendar.sync, { calendarId: Obj.getDXN(object).toString() }),
                      );
                    },
                    properties: {
                      label: ['sync calendar label', { ns: meta.id }],
                      icon: 'ph--arrows-clockwise--regular',
                      disposition: 'list-item',
                    },
                  },
                ]),
              ),
            ),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
});
