//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';

import * as Progress from '@dxos/app-toolkit/Progress';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { Channel, Message, Person } from '@dxos/types';

import { SlackChannel } from '#types';

import { SLACK_SOURCE } from '../constants.ts';
import syncHandler, { findOrCreateChannelForTarget } from './sync.ts';

const history = [
  { type: 'message', ts: '1700000001.000000', user: 'U1', text: 'first' },
  { type: 'message', ts: '1700000002.000000', user: 'U1', subtype: 'channel_join' },
  { type: 'message', ts: '1700000003.000000', user: 'U1', text: 'third' },
];

/** A fake Slack Web API answering the calls a channel sync makes. */
const fakeSlackFetch: typeof globalThis.fetch = async (input) => {
  const url = input instanceof Request ? input.url : String(input);
  switch (url.split('/').at(-1)) {
    case 'conversations.list':
      return Response.json({ ok: true, channels: [{ id: 'C1', name: 'general', is_channel: true }] });
    case 'conversations.history':
      return Response.json({ ok: true, messages: history });
    case 'users.info':
      return Response.json({ ok: true, user: { id: 'U1', name: 'alice' } });
    default:
      return Response.json({ ok: false, error: 'unknown_method' });
  }
};

// The success toast has no handler here; the sync ignores its failure.
const noOperations = Effect.provideService(Operation.Service, {
  invoke: (operation: Operation.Definition.Any, ..._args: unknown[]) =>
    Effect.fail(new Operation.NoHandlerError(operation.meta.key)),
  schedule: () => Effect.void,
  invokePromise: async () => ({ error: new Error('Not available') }),
});

const testLayer = () =>
  TestDatabaseLayer({
    types: [
      AccessToken.AccessToken,
      Channel.Channel,
      Connection.Connection,
      Cursor.Cursor,
      Feed.Feed,
      Message.Message,
      Person.Person,
      SlackChannel.SlackChannel,
    ],
  });

describe('SyncSlackChannel', () => {
  it.effect('reports one meter per channel with the history length as its total', () =>
    Effect.gen(function* () {
      const accessToken = yield* Database.add(AccessToken.make({ source: SLACK_SOURCE, token: 'xoxb-secret' }));
      const connection = yield* Database.add(
        Connection.make({ connectorId: 'slack', accessToken: Ref.make(accessToken) }),
      );
      const channel = yield* findOrCreateChannelForTarget({
        externalId: 'C1',
        name: '#general',
        accessToken: Ref.make(accessToken),
      });
      yield* Database.add(
        Cursor.makeExternal({
          source: Ref.make(accessToken),
          target: Ref.make(channel),
          externalId: 'C1',
          label: '#general',
        }),
      );
      yield* Database.flush();

      const statusUpdates: Trace.PayloadType<typeof Trace.StatusUpdate>[] = [];
      const traceLayer = Trace.testTraceService().pipe(
        Layer.provide(
          Layer.succeed(Trace.TraceSink, {
            write: (message) => {
              for (const event of Trace.flatten(message)) {
                if (Trace.isOfType(Trace.StatusUpdate, event)) {
                  statusUpdates.push(event.data);
                }
              }
            },
          }),
        ),
      );

      const result = yield* syncHandler
        .handler({ connection: Ref.make(connection) })
        .pipe(noOperations, Effect.provideService(FetchHttpClient.Fetch, fakeSlackFetch), Effect.provide(traceLayer));
      expect(result.pulled.added).toBe(2);

      const syncKey = Progress.createSyncKey(channel);
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates.every((update) => update.progress?.key === syncKey)).toBe(true);

      const totalIndex = statusUpdates.findIndex((update) => update.progress?.total === history.length);
      const firstCountIndex = statusUpdates.findIndex((update) => (update.progress?.current ?? 0) > 0);
      expect(totalIndex).toBeGreaterThanOrEqual(0);
      expect(totalIndex).toBeLessThan(firstCountIndex);

      const counts = statusUpdates.flatMap((update) =>
        update.progress?.current === undefined ? [] : [update.progress.current],
      );
      expect(counts.at(-1)).toBe(history.length);
      expect(statusUpdates.at(-1)?.message).toBe(Progress.STATUS_COMPLETE);
    }).pipe(Effect.provide(testLayer())),
  );
});
