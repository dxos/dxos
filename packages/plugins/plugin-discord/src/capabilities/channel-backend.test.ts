//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Registry from 'effect/reactivity/AtomRegistry';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { type Context } from '@dxos/context';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EdgeHttpClient, type EdgeRequestArgs } from '@dxos/edge-client';
import { AccessToken } from '@dxos/link';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';
import { Channel, Message, Person } from '@dxos/types';

import { DiscordBot, DiscordChannel } from '#types';

import openDirect from '../operations/channel/open-direct.ts';
import sendHandler from '../operations/channel/send.ts';
import { makeDiscordChannelBackend } from './channel-backend.ts';

type RecordedRequest = { path: string } & EdgeRequestArgs;

/** Records each request and answers with a canned status, standing in for the EDGE bot route. */
class MockEdgeHttpClient extends EdgeHttpClient {
  readonly requests: RecordedRequest[] = [];

  constructor(private readonly _response: unknown) {
    super('http://edge.test');
  }

  override async request(_ctx: Context, path: string, args: EdgeRequestArgs): Promise<unknown> {
    this.requests.push({ path, ...args });
    return this._response;
  }
}

type Act = { bot: DiscordBot.Bot; action: DiscordBot.Action };

/** A fake bot that records each action and answers like EDGE's: a DM lands in `dm-<user>`, or fails with `fail`. */
const fakeBot = ({ fail }: { fail?: string } = {}) => {
  const acts: Act[] = [];
  const service: DiscordBot.Service = {
    act: (bot, action) =>
      Effect.suspend(() => {
        acts.push({ bot, action });
        if (fail !== undefined) {
          return Effect.fail(new DiscordBot.DiscordBotError({ message: fail }));
        }
        const channelId = action.kind === 'dm' ? `dm-${action.userId}` : action.channelId;
        return Effect.succeed({ channelId, messageId: `message-${acts.length}` });
      }),
    findMembers: () => Effect.succeed([]),
  };
  return { acts, service };
};

const READY: DiscordChannel.BotStatus = { running: true, gateway: 'ready', botUserId: 'bot-1', threads: 2 };

const testLayer = () =>
  TestDatabaseLayer({
    types: [Channel.Channel, DiscordChannel.DiscordChannel, AccessToken.AccessToken, Person.Person],
  });

const withCapabilities = Effect.provideService(
  Capability.Service,
  CapabilityManager.make({ registry: Registry.make() }),
);

/** A Discord-backed channel whose bot posts with the given token. */
const makeChannel = (token = 'bot-secret') =>
  Effect.gen(function* () {
    const accessToken = yield* Database.add(AccessToken.make({ source: 'discord.com', token }));
    const channel = yield* Database.add(
      Channel.make({
        name: 'general',
        backend: {
          kind: DiscordChannel.BACKEND_KIND,
          config: DiscordChannel.make({ accessToken: Ref.make(accessToken), applicationId: 'app-1', channels: ['c1'] }),
        },
      }),
    );
    yield* Database.flush();
    const config = yield* Database.load(channel.backend.config);
    return { channel, configId: config.id };
  });

const text = (value: string) =>
  Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text: value }] });

describe('Discord channel backend', () => {
  it.effect('names a pending DM from the discord identity without calling the bot', () =>
    Effect.gen(function* () {
      const bot = fakeBot();
      const backend = makeDiscordChannelBackend({ bot: bot.service });
      const { channel } = yield* makeChannel(MANAGED_ACCESS_TOKEN);
      const josiah = Person.make({
        fullName: 'Josiah',
        identities: [{ label: 'discord', value: '700000000000000007' }],
      });
      const thread = yield* (backend.openDirect?.(channel, josiah) ?? Effect.succeed(undefined)).pipe(withCapabilities);
      expect(thread).toBe(DiscordChannel.pendingDmThread('700000000000000007'));
      expect(DiscordChannel.pendingDmUser(thread ?? '')).toBe('700000000000000007');
      expect(DiscordChannel.pendingDmUser('1400000000000000001')).toBeUndefined();
      const nobody = Person.make({ fullName: 'Nobody' });
      expect(
        yield* (backend.openDirect?.(channel, nobody) ?? Effect.succeed(undefined)).pipe(withCapabilities),
      ).toBeUndefined();
      // Only a handle an agent kept, which Discord opens no DM with, or two ids: refused, saying what to record.
      const refused = (person: Person.Person) =>
        (backend.openDirect?.(channel, person) ?? Effect.succeed(undefined)).pipe(withCapabilities, Effect.flip);
      const handle = yield* refused(
        Person.make({ fullName: 'Rich', identities: [{ label: 'discord', value: '@richburdon' }] }),
      );
      expect(handle.message).toBe(
        "Rich's Discord identity (@richburdon) is not a user id; record their Discord user id to message them directly.",
      );
      // `@` before digits may be a numeric username, which cannot be looked up here.
      const numeric = yield* refused(
        Person.make({ fullName: 'Numbers', identities: [{ label: 'discord', value: '@700000000000000009' }] }),
      );
      expect(numeric.message).toBe(
        "Numbers's Discord identity (@700000000000000009) is not a user id; record their Discord user id to message them directly.",
      );
      const twoIds = yield* refused(
        Person.make({
          fullName: 'Sam',
          identities: [
            { label: 'discord', value: '700000000000000007' },
            { label: 'Discord', value: '700000000000000008' },
          ],
        }),
      );
      expect(twoIds.message).toBe(
        'Sam has more than one Discord user id on record: 700000000000000007, 700000000000000008.',
      );
      expect(bot.acts).toHaveLength(0);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("a send to a pending DM opens it through the bot's act and reports the DM channel as the thread", () =>
    Effect.gen(function* () {
      const bot = fakeBot();
      const backend = makeDiscordChannelBackend({ bot: bot.service });
      // Kai's token stays on EDGE; the bot posts with it, so a managed token sends too.
      const { channel } = yield* makeChannel(MANAGED_ACCESS_TOKEN);
      const spaceId = yield* Database.spaceId;
      const receipt = yield* (
        backend.threads?.send(channel, DiscordChannel.pendingDmThread('user-7'), text('hello')) ?? Effect.void
      ).pipe(withCapabilities);
      expect(receipt).toEqual({
        thread: 'dm-user-7',
        messageIds: ['message-1'],
        properties: { discord: { channelId: 'dm-user-7', messageId: 'message-1' } },
      });
      expect(bot.acts).toEqual([
        {
          bot: { applicationId: 'app-1', spaceId, channel: `echo://${spaceId}/${channel.id}` },
          action: { kind: 'dm', userId: 'user-7', text: 'hello' },
        },
      ]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('posts into a thread, and with no thread into the first listed Discord channel', () =>
    Effect.gen(function* () {
      const bot = fakeBot();
      const backend = makeDiscordChannelBackend({ bot: bot.service });
      const { channel } = yield* makeChannel();
      yield* (backend.threads?.send(channel, 'thread-1', text('in thread')) ?? Effect.void).pipe(withCapabilities);
      yield* backend.send(channel, text('hi')).pipe(withCapabilities);
      expect(bot.acts.map(({ action }) => action)).toEqual([
        { kind: 'post', channelId: 'thread-1', text: 'in thread' },
        { kind: 'post', channelId: 'c1', text: 'hi' },
      ]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('fails with the reason the bot gave', () =>
    Effect.gen(function* () {
      const bot = fakeBot({ fail: 'Discord will not let the bot message this user.' });
      const backend = makeDiscordChannelBackend({ bot: bot.service });
      const { channel } = yield* makeChannel();
      const exit = yield* backend.send(channel, text('hi')).pipe(withCapabilities, Effect.exit);
      expect(Exit.isFailure(exit) ? String(exit.cause) : undefined).toContain('will not let the bot message');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("acts through the app's EDGE client when the host provides no bot service", () =>
    Effect.gen(function* () {
      const edge = new MockEdgeHttpClient({ channelId: 'c1', messageId: 'message-9' });
      const backend = makeDiscordChannelBackend({ edgeClient: Effect.succeed(edge) });
      const { channel } = yield* makeChannel();
      const spaceId = yield* Database.spaceId;
      const receipt = yield* backend.send(channel, text('hi')).pipe(withCapabilities);
      expect(receipt).toMatchObject({ messageIds: ['message-9'] });
      // A post lands where it was asked to, so only a DM names its thread: a channel-level send stays channel-level.
      expect(receipt).not.toHaveProperty('thread');
      expect(edge.requests).toEqual([
        {
          path: '/discord/bots/app-1/actions',
          method: 'POST',
          body: {
            spaceId,
            channel: `echo://${spaceId}/${channel.id}`,
            action: { kind: 'post', channelId: 'c1', text: 'hi' },
          },
        },
      ]);
    }).pipe(Effect.provide(testLayer())),
  );
});

describe('Discord channel connection', () => {
  it.effect('start PUTs the config and channel URIs; status and stop map the bot status', () =>
    Effect.gen(function* () {
      const edge = new MockEdgeHttpClient({ ...READY });
      const backend = makeDiscordChannelBackend({ edgeClient: Effect.succeed(edge) });
      const { channel, configId } = yield* makeChannel();
      const spaceId = yield* Database.spaceId;
      const connection = backend.connection;
      expect(connection).toBeDefined();
      if (!connection) {
        return;
      }

      const started = yield* connection.start(channel).pipe(withCapabilities);
      expect(started).toEqual({ running: true, state: 'ready', detail: '2 threads' });
      yield* connection.status(channel).pipe(withCapabilities);
      yield* connection.stop(channel).pipe(withCapabilities);
      expect(edge.requests).toEqual([
        {
          path: '/discord/bots/app-1',
          method: 'PUT',
          body: {
            spaceId,
            binding: `echo://${spaceId}/${configId}`,
            channel: `echo://${spaceId}/${channel.id}`,
          },
        },
        { path: '/discord/bots/app-1', method: 'GET' },
        { path: '/discord/bots/app-1', method: 'DELETE' },
      ]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('reports a bot started from another config, and its gateway error', () =>
    Effect.gen(function* () {
      const failed: DiscordChannel.BotStatus = {
        running: true,
        gateway: 'failed',
        threads: 1,
        lastError: 'Authentication failed.',
        config: { spaceId: 's', applicationId: 'app-1', accessTokenId: 't', channels: [], binding: 'echo://s/other' },
      };
      const backend = makeDiscordChannelBackend({ edgeClient: Effect.succeed(new MockEdgeHttpClient(failed)) });
      const { channel } = yield* makeChannel();
      const status = yield* (backend.connection?.status(channel) ?? Effect.die('no connection')).pipe(withCapabilities);
      expect(status).toEqual({
        running: true,
        state: DiscordChannel.OTHER_CONFIG_STATE,
        detail: '1 thread',
        error: 'Authentication failed.',
      });
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('fails on a response that is not a bot status', () =>
    Effect.gen(function* () {
      const backend = makeDiscordChannelBackend({
        edgeClient: Effect.succeed(new MockEdgeHttpClient({ unexpected: true })),
      });
      const { channel } = yield* makeChannel();
      const exit = yield* (backend.connection?.status(channel) ?? Effect.die('no connection')).pipe(
        withCapabilities,
        Effect.exit,
      );
      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(Effect.provide(testLayer())),
  );

  it('declares its own operations under the keys plugin-thread derives from its kind', () => {
    const derived = ThreadOperation.backendOperations(DiscordChannel.BACKEND_KIND);
    expect(DiscordChannel.BackendOperation.Send.meta.key).toBe(derived.Send.meta.key);
    expect(DiscordChannel.BackendOperation.OpenDirect.meta.key).toBe(derived.OpenDirect.meta.key);
  });

  it.effect('its own operations post through the bot EDGE serves, where plugin-thread cannot see the backend', () =>
    Effect.gen(function* () {
      const bot = fakeBot();
      const { channel } = yield* makeChannel(MANAGED_ACCESS_TOKEN);
      const josiah = yield* Database.add(
        Person.make({ fullName: 'Josiah', identities: [{ label: 'discord', value: '700000000000000007' }] }),
      );
      const services = <A, E>(
        effect: Effect.Effect<A, E, DiscordBot.DiscordBotService | Capability.Service | Database.Service>,
      ) => effect.pipe(Effect.provideService(DiscordBot.DiscordBotService, bot.service), withCapabilities);

      const direct = yield* services(openDirect.handler({ channel: Ref.make(channel), person: Ref.make(josiah) }));
      expect(direct).toEqual({ thread: DiscordChannel.pendingDmThread('700000000000000007') });
      const sent = yield* services(
        sendHandler.handler({ channel: Ref.make(channel), thread: direct.thread, text: 'Hi.' }),
      );
      expect(sent).toMatchObject({ delivered: true, thread: 'dm-700000000000000007' });
      expect(bot.acts.map(({ action }) => action)).toEqual([{ kind: 'dm', userId: '700000000000000007', text: 'Hi.' }]);
    }).pipe(Effect.provide(testLayer())),
  );
});
