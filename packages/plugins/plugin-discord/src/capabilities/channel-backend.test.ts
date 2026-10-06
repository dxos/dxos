//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, it, vi } from '@effect/vitest';
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
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';
import { Channel, Message, Person } from '@dxos/types';

import { DiscordChannel } from '#types';

import { chunkText } from '../services/bot-rest.ts';
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

type Call = { url: string; method?: string; authorization?: string; body: unknown };

/** A fake Discord REST API: answers DM-channel and message posts, or a scripted error. */
const fakeDiscord = (options: { fail?: { status: number; code?: number; message?: string } } = {}) => {
  const calls: Call[] = [];
  let next = 0;
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      method: init?.method,
      authorization: headers.get('Authorization') ?? undefined,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    if (options.fail) {
      return Response.json({ code: options.fail.code, message: options.fail.message }, { status: options.fail.status });
    }
    if (url.endsWith('/users/@me/channels')) {
      return Response.json({ id: 'dm-1', type: 1 });
    }
    return Response.json({ id: `message-${++next}` });
  });
  return { calls, fetch };
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

describe('chunkText', () => {
  it('splits past the limit on a boundary and keeps short text whole', () => {
    expect(chunkText('hello')).toEqual(['hello']);
    const words = Array.from({ length: 50 }, (_, index) => `word${index}`).join(' ');
    const chunks = chunkText(words, 100);
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true);
    expect(chunks.join(' ')).toBe(words);
    expect(chunkText('x'.repeat(250), 100).map((chunk) => chunk.length)).toEqual([100, 100, 50]);
  });
});

describe('Discord channel backend', () => {
  let discord: ReturnType<typeof fakeDiscord>;
  beforeEach(() => {
    discord = fakeDiscord();
    vi.stubGlobal('fetch', discord.fetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect('opens a DM from the discord identity and posts into it in chunks without mentions', () =>
    Effect.gen(function* () {
      const backend = makeDiscordChannelBackend();
      const { channel } = yield* makeChannel();
      const josiah = Person.make({ fullName: 'Josiah', identities: [{ label: 'discord', value: 'user-7' }] });

      const thread = yield* (backend.openDirect?.(channel, josiah) ?? Effect.succeed(undefined)).pipe(withCapabilities);
      expect(thread).toBe('dm-1');
      const nobody = Person.make({ fullName: 'Nobody' });
      expect(
        yield* (backend.openDirect?.(channel, nobody) ?? Effect.succeed(undefined)).pipe(withCapabilities),
      ).toBeUndefined();

      const body = `${'a'.repeat(1500)}\n${'b'.repeat(1000)}`;
      const receipt = yield* (backend.threads?.send(channel, 'dm-1', text(body)) ?? Effect.void).pipe(withCapabilities);
      expect(receipt).toEqual({
        messageIds: ['message-1', 'message-2'],
        properties: { discord: { channelId: 'dm-1', messageId: 'message-1', messageIds: ['message-1', 'message-2'] } },
      });
      expect(discord.calls.map(({ url, method }) => ({ url, method }))).toEqual([
        { url: 'https://discord.com/api/v10/users/@me/channels', method: 'POST' },
        { url: 'https://discord.com/api/v10/channels/dm-1/messages', method: 'POST' },
        { url: 'https://discord.com/api/v10/channels/dm-1/messages', method: 'POST' },
      ]);
      expect(discord.calls[0].authorization).toBe('Bot bot-secret');
      expect(discord.calls[0].body).toEqual({ recipient_id: 'user-7' });
      expect(discord.calls[1].body).toEqual({ content: 'a'.repeat(1500), allowed_mentions: { parse: [] } });
      expect(discord.calls[2].body).toEqual({ content: 'b'.repeat(1000), allowed_mentions: { parse: [] } });
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('posts with no thread into the first listed Discord channel', () =>
    Effect.gen(function* () {
      const backend = makeDiscordChannelBackend();
      const { channel } = yield* makeChannel();
      yield* backend.send(channel, text('hi')).pipe(withCapabilities);
      expect(discord.calls.map(({ url }) => url)).toEqual(['https://discord.com/api/v10/channels/c1/messages']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('fails with the reason Discord gave for a closed DM (50007)', () =>
    Effect.gen(function* () {
      discord = fakeDiscord({ fail: { status: 403, code: 50007, message: 'Cannot send messages to this user' } });
      vi.stubGlobal('fetch', discord.fetch);
      const backend = makeDiscordChannelBackend();
      const { channel } = yield* makeChannel();
      const exit = yield* backend.send(channel, text('hi')).pipe(withCapabilities, Effect.exit);
      expect(Exit.isFailure(exit) ? String(exit.cause) : undefined).toContain('DMs are closed');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('declines a managed token without calling Discord', () =>
    Effect.gen(function* () {
      const backend = makeDiscordChannelBackend();
      const { channel } = yield* makeChannel(MANAGED_ACCESS_TOKEN);
      const exit = yield* backend.send(channel, text('hi')).pipe(withCapabilities, Effect.exit);
      expect(Exit.isFailure(exit) ? String(exit.cause) : undefined).toContain('managed');
      expect(discord.calls).toHaveLength(0);
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
          path: '/compute/discord/bots/app-1',
          method: 'PUT',
          body: {
            spaceId,
            binding: `echo://${spaceId}/${configId}`,
            channel: `echo://${spaceId}/${channel.id}`,
          },
        },
        { path: '/compute/discord/bots/app-1', method: 'GET' },
        { path: '/compute/discord/bots/app-1', method: 'DELETE' },
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
});
