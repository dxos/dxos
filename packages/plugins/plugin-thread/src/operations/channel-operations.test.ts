//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { BaseError } from '@dxos/errors';
import { Channel, Message, Person } from '@dxos/types';

import { ChannelBackend, ThreadCapabilities, type ThreadOperation } from '#types';

import { feedChannelBackend } from '../capabilities/channel-backend-feed.ts';
import connectChannel from './connect-channel.ts';
import deleteThread from './delete-thread.ts';
import disconnectChannel from './disconnect-channel.ts';
import getChannelStatus from './get-channel-status.ts';
import openDirect from './open-direct.ts';
import sendToChannel from './send-to-channel.ts';

const FAKE_KIND = 'org.dxos.channel.backend.fake';

class RefusedError extends BaseError.extend('RefusedError', 'The backend refused the post.') {}

/** A backend with every optional member, recording what it was asked to do. */
const makeFakeBackend = () => {
  const sent: { thread?: string; text: string }[] = [];
  const removed: string[] = [];
  let running = false;
  const status = (): ThreadOperation.ConnectionStatus => ({ running, state: running ? 'ready' : 'idle' });
  const record = (message: Message.Message, thread?: string) =>
    Effect.sync(() => {
      const text = Message.extractText(message);
      if (text === 'refuse') {
        return Effect.fail(new RefusedError());
      }
      sent.push({ thread, text });
      return Effect.succeed({ messageIds: [`m${sent.length}`], properties: { fake: { thread } } });
    }).pipe(Effect.flatten);

  const provider: ThreadCapabilities.ChannelBackendProvider = {
    kind: FAKE_KIND,
    label: 'Fake',
    createFields: Schema.Struct({}),
    makeConfig: () => Feed.make(),
    subscribe: () => () => {},
    send: (_channel, message) => record(message),
    openDirect: (_channel, person) =>
      Effect.succeed(person.identities?.find((identity) => identity.label === 'fake')?.value),
    threads: {
      send: (_channel, thread, message) => record(message, thread),
      remove: (_channel, thread) =>
        thread === 'locked' ? Effect.fail(new RefusedError()) : Effect.sync(() => void removed.push(thread)),
    },
    connection: {
      start: () => Effect.sync(() => ((running = true), status())),
      stop: () => Effect.sync(() => ((running = false), status())),
      status: () => Effect.sync(status),
    },
  };
  return { provider, sent, removed };
};

/** Capability manager holding the given channel backends, as plugin-thread and backend plugins contribute them. */
const capabilities = (...providers: ThreadCapabilities.ChannelBackendProvider[]) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  for (const provider of providers) {
    manager.contribute({
      interface: ThreadCapabilities.ChannelBackend,
      implementation: provider,
      module: provider.kind,
    });
  }
  return manager;
};

/** The printed cause of a failed exit, or undefined when it succeeded. */
const failureOf = <A, E>(exit: Exit.Exit<A, E>): string | undefined =>
  Exit.isFailure(exit) ? String(exit.cause) : undefined;

const testLayer = () => TestDatabaseLayer({ types: [Channel.Channel, Feed.Feed, Message.Message, Person.Person] });

describe('channel operations', () => {
  it.effect('sendToChannel appends to a feed-backed channel', () =>
    Effect.gen(function* () {
      const channel = yield* Database.add(Channel.make({ name: 'general' }));
      yield* Database.flush();

      const result = yield* sendToChannel
        .handler({ channel: Ref.make(channel), text: 'hello' })
        .pipe(Effect.provideService(Capability.Service, capabilities(feedChannelBackend)));
      expect(result).toEqual({ delivered: true });

      const feed = Channel.getFeed(channel);
      expect(feed).toBeDefined();
      if (feed) {
        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        expect(messages.map(Message.extractText)).toEqual(['hello']);
      }
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('sendToChannel with a thread fails on a backend without threads', () =>
    Effect.gen(function* () {
      const channel = yield* Database.add(Channel.make({ name: 'general' }));
      const exit = yield* sendToChannel
        .handler({ channel: Ref.make(channel), thread: 't1', text: 'hello' })
        .pipe(Effect.provideService(Capability.Service, capabilities(feedChannelBackend)), Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(String(exit.cause)).toContain('does not support threads');
      }
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('fails with a typed error when no backend handles the channel', () =>
    Effect.gen(function* () {
      const channel = yield* Database.add(Channel.make({ backend: { kind: FAKE_KIND, config: Feed.make() } }));
      const exit = yield* getChannelStatus
        .handler({ channel: Ref.make(channel) })
        .pipe(Effect.provideService(Capability.Service, capabilities(feedChannelBackend)), Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(String(exit.cause)).toContain('ChannelBackendNotFoundError');
      }
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('deleteThread removes the thread on the backend and reports a refusal as an outcome', () =>
    Effect.gen(function* () {
      const { provider, removed } = makeFakeBackend();
      const channel = yield* Database.add(Channel.make({ backend: { kind: FAKE_KIND, config: Feed.make() } }));
      const withBackend = Effect.provideService(Capability.Service, capabilities(feedChannelBackend, provider));

      expect(yield* deleteThread.handler({ channel: Ref.make(channel), thread: 't1' }).pipe(withBackend)).toEqual({
        deleted: true,
      });
      expect(removed).toEqual(['t1']);

      const refused = yield* deleteThread.handler({ channel: Ref.make(channel), thread: 'locked' }).pipe(withBackend);
      expect(refused.deleted).toBe(false);
      expect(refused.reason).toContain('refused');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('deleteThread reports a backend that cannot delete threads', () =>
    Effect.gen(function* () {
      const { provider } = makeFakeBackend();
      const threads: ThreadCapabilities.ChannelThreads = {
        send: (_channel, _thread, message) => provider.send(channel, message),
      };
      const channel = yield* Database.add(Channel.make({ backend: { kind: FAKE_KIND, config: Feed.make() } }));
      const result = yield* deleteThread
        .handler({ channel: Ref.make(channel), thread: 't1' })
        .pipe(Effect.provideService(Capability.Service, capabilities({ ...provider, threads })));
      expect(result).toEqual({ deleted: false, reason: 'The Fake channel backend cannot delete threads.' });
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('dispatches threads, direct conversations and the connection to the backend', () =>
    Effect.gen(function* () {
      const { provider, sent } = makeFakeBackend();
      const channel = yield* Database.add(Channel.make({ backend: { kind: FAKE_KIND, config: Feed.make() } }));
      const dima = yield* Database.add(Person.make({ fullName: 'Dima', identities: [{ label: 'fake', value: 'd1' }] }));
      const nobody = yield* Database.add(Person.make({ fullName: 'Nobody' }));
      const withBackend = Effect.provideService(Capability.Service, capabilities(feedChannelBackend, provider));

      const direct = yield* openDirect
        .handler({ channel: Ref.make(channel), person: Ref.make(dima) })
        .pipe(withBackend);
      expect(direct).toEqual({ thread: 'd1' });
      const unreachable = yield* openDirect
        .handler({ channel: Ref.make(channel), person: Ref.make(nobody) })
        .pipe(withBackend);
      expect(unreachable.thread).toBeUndefined();
      expect(unreachable.reason).toContain('Fake');

      const posted = yield* sendToChannel
        .handler({ channel: Ref.make(channel), thread: 'd1', text: 'hi' })
        .pipe(withBackend);
      expect(posted).toEqual({ delivered: true, messageIds: ['m1'], properties: { fake: { thread: 'd1' } } });
      const refused = yield* sendToChannel.handler({ channel: Ref.make(channel), text: 'refuse' }).pipe(withBackend);
      expect(refused).toEqual({ delivered: false, reason: 'The backend refused the post.' });
      expect(sent).toEqual([{ thread: 'd1', text: 'hi' }]);

      expect((yield* getChannelStatus.handler({ channel: Ref.make(channel) }).pipe(withBackend)).status.running).toBe(
        false,
      );
      expect((yield* connectChannel.handler({ channel: Ref.make(channel) }).pipe(withBackend)).status).toEqual({
        running: true,
        state: 'ready',
      });
      expect((yield* disconnectChannel.handler({ channel: Ref.make(channel) }).pipe(withBackend)).status.running).toBe(
        false,
      );
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a backend is mirrored only when it says so', () =>
    Effect.gen(function* () {
      const { provider } = makeFakeBackend();
      const fake = yield* Database.add(Channel.make({ backend: { kind: FAKE_KIND, config: Feed.make() } }));
      const feed = yield* Database.add(Channel.make({ name: 'general' }));
      const orphan = yield* Database.add(
        Channel.make({ backend: { kind: 'org.dxos.channel.backend.missing', config: Feed.make() } }),
      );
      const mirrored = (...providers: ThreadCapabilities.ChannelBackendProvider[]) =>
        Effect.forEach([fake, feed, orphan], (channel) =>
          ChannelBackend.isMirrored(channel).pipe(
            Effect.provideService(Capability.Service, capabilities(feedChannelBackend, ...providers)),
          ),
        );

      expect(yield* mirrored(provider)).toEqual([false, false, false]);
      expect(yield* mirrored({ ...provider, mirrored: true })).toEqual([true, false, false]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('openDirect and the connection fail with a typed error on a backend without them', () =>
    Effect.gen(function* () {
      const channel = yield* Database.add(Channel.make({ name: 'general' }));
      const person = yield* Database.add(Person.make({ fullName: 'Dima' }));
      const withFeed = Effect.provideService(Capability.Service, capabilities(feedChannelBackend));

      const direct = yield* openDirect
        .handler({ channel: Ref.make(channel), person: Ref.make(person) })
        .pipe(withFeed, Effect.exit);
      const connect = yield* connectChannel.handler({ channel: Ref.make(channel) }).pipe(withFeed, Effect.exit);
      expect([failureOf(direct), failureOf(connect)]).toEqual([
        expect.stringContaining('ChannelBackendUnsupportedError'),
        expect.stringContaining('ChannelBackendUnsupportedError'),
      ]);
    }).pipe(Effect.provide(testLayer())),
  );
});
