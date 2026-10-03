//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { type Context } from '@dxos/context';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EdgeHttpClient, EdgeHttpClientService, type EdgeRequestArgs } from '@dxos/edge-client';
import { AccessToken } from '@dxos/link';
import { Text } from '@dxos/schema';

import { DiscordBinding, type DiscordOperation } from '#types';

import getDiscordBotStatus from './get-discord-bot-status.ts';
import startDiscordBot from './start-discord-bot.ts';
import stopDiscordBot from './stop-discord-bot.ts';

type RecordedRequest = { path: string } & EdgeRequestArgs;

/** Records each request and answers with a canned status, standing in for the EDGE route. */
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

const READY: DiscordOperation.BotStatus = { running: true, gateway: 'ready', botUserId: 'bot-1', threads: 2 };

const testLayer = () =>
  TestDatabaseLayer({
    types: [Agent.Agent, Instructions.Instructions, Text.Text, AccessToken.AccessToken, DiscordBinding.DiscordBinding],
  });

const makeBinding = Effect.gen(function* () {
  const instructions = yield* Database.add(Instructions.make({ text: 'Greet people.' }));
  const agent = yield* Database.add(Obj.make(Agent.Agent, { name: 'Concierge', instructions: Ref.make(instructions) }));
  const token = yield* Database.add(AccessToken.make({ source: 'discord.com', token: 'secret' }));
  const binding = yield* Database.add(
    DiscordBinding.make({ agent, accessToken: Ref.make(token), applicationId: 'app-1', channels: ['c1'] }),
  );
  yield* Database.flush();
  return binding;
});

describe('Discord bot operations', () => {
  it.effect('start PUTs the binding URI and space id', () =>
    Effect.gen(function* () {
      const binding = yield* makeBinding;
      const spaceId = yield* Database.spaceId;
      const edge = new MockEdgeHttpClient(READY);

      const result = yield* startDiscordBot
        .handler({ binding: Ref.make(binding) })
        .pipe(Effect.provideService(EdgeHttpClientService, edge));

      expect(result.status).toEqual(READY);
      expect(edge.requests).toEqual([
        {
          path: '/compute/discord/bots/app-1',
          method: 'PUT',
          body: { spaceId, binding: `echo://${spaceId}/${binding.id}` },
        },
      ]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('status GETs the bot route and surfaces the gateway error', () =>
    Effect.gen(function* () {
      const binding = yield* makeBinding;
      const failed = { running: true, gateway: 'failed', threads: 0, lastError: 'Authentication failed.' };
      const edge = new MockEdgeHttpClient(failed);

      const result = yield* getDiscordBotStatus
        .handler({ binding: Ref.make(binding) })
        .pipe(Effect.provideService(EdgeHttpClientService, edge));

      expect(result.status.lastError).toBe('Authentication failed.');
      expect(edge.requests).toEqual([{ path: '/compute/discord/bots/app-1', method: 'GET' }]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('stop DELETEs the bot route', () =>
    Effect.gen(function* () {
      const binding = yield* makeBinding;
      const edge = new MockEdgeHttpClient({ ...READY, running: false, gateway: 'closed' });

      const result = yield* stopDiscordBot
        .handler({ binding: Ref.make(binding) })
        .pipe(Effect.provideService(EdgeHttpClientService, edge));

      expect(result).toEqual({});
      expect(edge.requests).toEqual([{ path: '/compute/discord/bots/app-1', method: 'DELETE' }]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('fails on a response that is not a bot status', () =>
    Effect.gen(function* () {
      const binding = yield* makeBinding;
      const edge = new MockEdgeHttpClient({ unexpected: true });

      const exit = yield* getDiscordBotStatus
        .handler({ binding: Ref.make(binding) })
        .pipe(Effect.provideService(EdgeHttpClientService, edge), Effect.exit);

      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(Effect.provide(testLayer())),
  );
});
