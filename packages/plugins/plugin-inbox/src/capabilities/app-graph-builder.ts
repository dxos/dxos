//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { type Database, Filter, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ACTION_TYPE, atomFromSignal, createExtension } from '@dxos/plugin-graph';
import { atomFromQuery } from '@dxos/plugin-space';
import { type Event, type Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { calendar, gmail } from '../functions';
import { meta } from '../meta';
import { Calendar, Mailbox } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
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
                atomFromSignal(() => [
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
                        type: ACTION_TYPE,
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
    createExtension({
      id: `${meta.id}/mailbox-message`,
      connector: (node) => {
        let prevMessageId: string | undefined;
        let query: Database.QueryResult<Message.Message> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => {
              if (!Obj.instanceOf(Mailbox.Mailbox, node.data)) {
                return Option.none();
              }

              const queue = get(atomFromSignal(() => node.data.queue.target));
              if (!queue) {
                return Option.none();
              }

              return Option.some({ nodeId: node.id, queue });
            }),
            Option.map(({ nodeId, queue }) => {
              const selection = get(context.capabilities(AttentionCapabilities.Selection))[0];
              const messageId = get(atomFromSignal(() => selection?.getSelected(nodeId, 'single')));
              if (!query || prevMessageId !== messageId) {
                prevMessageId = messageId;
                query = queue.query(
                  messageId ? Filter.ids(messageId) : Filter.nothing(),
                ) as Database.QueryResult<Message.Message>;
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
    createExtension({
      id: `${meta.id}/calendar-event`,
      connector: (node) => {
        let prevEventId: string | undefined;
        let query: Database.QueryResult<Event.Event> | undefined;
        return Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => {
              if (!Obj.instanceOf(Calendar.Calendar, node.data)) {
                return Option.none();
              }

              const queue = get(atomFromSignal(() => node.data.queue.target));
              if (!queue) {
                return Option.none();
              }

              return Option.some({ nodeId: node.id, queue });
            }),
            Option.map(({ nodeId, queue }) => {
              const selection = get(context.capabilities(AttentionCapabilities.Selection))[0];
              const eventId = get(atomFromSignal(() => selection?.getSelected(nodeId, 'single')));
              if (!query || prevEventId !== eventId) {
                prevEventId = eventId;
                query = queue.query(
                  eventId ? Filter.ids(eventId) : Filter.nothing(),
                ) as Database.QueryResult<Event.Event>;
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
    createExtension({
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
                atomFromSignal(() => [
                  {
                    id: `${Obj.getDXN(mailbox).toString()}-sync`,
                    type: ACTION_TYPE,
                    data: async () => {
                      const space = getSpace(mailbox);
                      invariant(space);
                      const computeRuntime = context.getCapability(AutomationCapabilities.ComputeRuntime);
                      const runtime = computeRuntime.getRuntime(space.id);
                      await runtime.runPromise(
                        invokeFunctionWithTracing(gmail.sync, { mailboxId: Obj.getDXN(mailbox).toString() }),
                      );
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
    createExtension({
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
                atomFromSignal(() => [
                  {
                    id: `${Obj.getDXN(object).toString()}-sync`,
                    type: ACTION_TYPE,
                    data: async () => {
                      const space = getSpace(object);
                      invariant(space);
                      const computeRuntime = context.getCapability(AutomationCapabilities.ComputeRuntime);
                      const runtime = computeRuntime.getRuntime(space.id);
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
