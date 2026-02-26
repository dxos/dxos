//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { DXN, Filter, Obj, Query, Ref } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';
import { AccessToken, type Event, type Message } from '@dxos/types';
import { kebabize } from '@dxos/util';

import { CalendarFunctions, GmailFunctions } from '../../functions';
import { meta } from '../../meta';
import { Calendar, InboxOperation, Mailbox } from '../../types';

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
        id: `${meta.id}/mailbox-filters`,
        match: (node) => {
          if (!Mailbox.instanceOf(node.data)) {
            return Option.none();
          }
          const feed = node.data;
          const db = Obj.getDatabase(feed);
          if (!db || node.properties.filter !== undefined) {
            return Option.none();
          }
          return Option.some(feed);
        },
        connector: (feed, get) => {
          const db = Obj.getDatabase(feed);
          if (!db) {
            return Effect.succeed([]);
          }

          // TODO(wittjosiah): Not possible to filter by references yet.
          const configs = get(AtomQuery.make(db, Filter.type(Mailbox.Config)));
          const config = configs.find((config) => DXN.equals(config.feed.dxn, Obj.getDXN(feed)));
          if (!config?.filters?.length) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: `${Obj.getDXN(feed).toString()}-unfiltered`,
              type: `${Mailbox.kind}-filter`,
              data: feed,
              properties: {
                label: ['inbox label', { ns: meta.id }],
                icon: 'ph--tray--regular',
                filter: null,
              },
            },
            ...(config.filters?.map(({ name, filter }: { name: string; filter: any }) => ({
              id: `${Obj.getDXN(feed).toString()}-filter-${kebabize(name)}`,
              type: `${Mailbox.kind}-filter`,
              data: feed,
              properties: {
                label: name,
                icon: 'ph--tray--regular',
                filter,
              },
              nodes: [
                {
                  id: `${Obj.getDXN(feed).toString()}-filter-${kebabize(name)}-delete`,
                  type: Node.ActionType,
                  data: Effect.fnUntraced(function* () {
                    const index = config.filters.findIndex((f: any) => f.name === name);
                    Obj.change(config, (c: any) => {
                      c.filters.splice(index, 1);
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
          ]);
        },
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}/mailbox-message`,
        match: (node) => (Mailbox.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        connector: (feed, get) => {
          const db = Obj.getDatabase(feed);
          if (!db) {
            return Effect.succeed([]);
          }

          const nodeId = Obj.getDXN(feed).toString();
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
        connector: (feed, get) => {
          const db = Obj.getDatabase(feed);
          if (!db) {
            return Effect.succeed([]);
          }

          const nodeId = Obj.getDXN(feed).toString();
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
        actions: (feed) =>
          Effect.succeed([
            {
              id: `${Obj.getDXN(feed).toString()}-sync`,
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(feed);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    invokeFunctionWithTracing(GmailFunctions.Sync, {
                      feed: Ref.make(feed),
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
        actions: (feed) =>
          Effect.succeed([
            {
              id: `${Obj.getDXN(feed).toString()}-sync`,
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(feed);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    invokeFunctionWithTracing(CalendarFunctions.Sync, {
                      feed: Ref.make(feed),
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
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/send-document-as-email`,
        type: Markdown.Document,
        actions: (doc, get) => {
          const db = Obj.getDatabase(doc);
          if (!db) {
            return Effect.succeed([]);
          }

          // Single function call - no family creation inside callback.
          const tokens = get(AtomQuery.make(db, Filter.type(AccessToken.AccessToken)));
          const hasGoogleToken = tokens.some((token) => token.source?.includes('google'));
          if (!hasGoogleToken) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: `${Obj.getDXN(doc).toString()}-send-as-email`,
              data: Effect.fnUntraced(function* () {
                const text = yield* Effect.tryPromise(() => doc.content.load());
                const subject = doc.name ?? doc.fallbackName ?? '';
                const body = text?.content ?? '';
                yield* Operation.invoke(InboxOperation.OpenComposeEmail, { subject, body });
              }),
              properties: {
                label: ['send as email label', { ns: meta.id }],
                icon: 'ph--envelope--regular',
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
