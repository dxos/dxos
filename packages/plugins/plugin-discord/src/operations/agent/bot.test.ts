//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { type Context } from '@dxos/context';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { EdgeHttpClient, type EdgeRequestArgs } from '@dxos/edge-client';
import { EID } from '@dxos/keys';
import { AccessToken } from '@dxos/link';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import { Channel, Person } from '@dxos/types';

import { DiscordBot, DiscordChannel } from '#types';

import { makeEdgeDiscordBot } from '../../capabilities/discord-bot.ts';
import { agentBot, resolveUser } from './bot.ts';

const addAgent = () =>
  Database.add(
    Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(Instructions.make({ name: 'Kai', text: '' })) }),
  );

const BOT: DiscordBot.Bot = { applicationId: 'app-1', spaceId: 'space-1', channel: 'echo://space-1/channel-1' };

/** A bot host whose guild has the given members; a search returns those whose username or nickname starts with it. */
const fakeBot = (members: DiscordBot.Member[]) =>
  Layer.succeed(DiscordBot.DiscordBotService, {
    act: () => Effect.die('Not acted in this test.'),
    findMembers: (_bot, query) =>
      Effect.succeed(
        members.filter(({ username, displayName }) =>
          [username, displayName].some((name) => name?.toLowerCase().startsWith(query.toLowerCase())),
        ),
      ),
  });

const TestLayer = TestDatabaseLayer({
  types: [
    Agent.Agent,
    Instructions.Instructions,
    AgentChannels.AgentChannels,
    Channel.Channel,
    DiscordChannel.DiscordChannel,
    AccessToken.AccessToken,
    Person.Person,
  ],
});

describe('agentBot', () => {
  it.effect("names the bot of the agent's Discord channel", () =>
    Effect.gen(function* () {
      const agent = yield* addAgent();
      const token = yield* Database.add(Obj.make(AccessToken.AccessToken, { source: 'discord.com', token: 'x' }));
      const discord = yield* Database.add(
        Channel.make({
          backend: {
            kind: DiscordChannel.BACKEND_KIND,
            config: DiscordChannel.make({ accessToken: Ref.make(token), applicationId: 'app-7' }),
          },
        }),
      );
      yield* Database.add(AgentChannels.make({ agent, channels: [Channel.make(), discord] }));
      yield* Database.flush();
      const { db } = yield* Database.Service;

      expect(yield* agentBot(Ref.make(agent))).toEqual({
        applicationId: 'app-7',
        spaceId: db.spaceId,
        channel: EID.make({ spaceId: db.spaceId, entityId: discord.id }),
      });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('fails for an agent outside Discord', () =>
    Effect.gen(function* () {
      const agent = yield* addAgent();
      yield* Database.flush();
      const exit = yield* agentBot(Ref.make(agent)).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(Effect.provide(TestLayer)),
  );
});

describe('resolveUser', () => {
  const members: DiscordBot.Member[] = [
    { userId: '111111111111111111', username: 'richburdon', displayName: 'Rich' },
    { userId: '222222222222222222', username: 'richard', displayName: 'Richard' },
    { userId: '333333333333333333', username: 'dima' },
  ];

  it.effect("takes a user id as is, else a contact's Discord identity, else a member", () =>
    Effect.gen(function* () {
      yield* Database.add(
        Obj.make(Person.Person, {
          fullName: 'Josiah Witt',
          nickname: 'josiah',
          identities: [{ label: 'discord', value: '444444444444444444' }],
        }),
      );
      yield* Database.flush();

      expect(yield* resolveUser(BOT, '555555555555555555')).toBe('555555555555555555');
      expect(yield* resolveUser(BOT, 'Josiah Witt')).toBe('444444444444444444');
      expect(yield* resolveUser(BOT, '@josiah')).toBe('444444444444444444');
      expect(yield* resolveUser(BOT, '@richburdon')).toBe('111111111111111111');
      // An exact name wins over the other members it is a prefix of.
      expect(yield* resolveUser(BOT, 'rich')).toBe('111111111111111111');
      expect(yield* resolveUser(BOT, 'dima')).toBe('333333333333333333');
    }).pipe(Effect.provide(Layer.merge(TestLayer, fakeBot(members)))),
  );

  it.effect('refuses a name that matches nobody, or several members', () =>
    Effect.gen(function* () {
      const nobody = yield* resolveUser(BOT, 'zed').pipe(Effect.flip);
      const several = yield* resolveUser(BOT, 'ric').pipe(Effect.flip);
      expect(nobody.message).toBe('No Discord member is called zed.');
      expect(several.message).toBe('ric could be any of @richburdon, @richard.');
    }).pipe(Effect.provide(Layer.merge(TestLayer, fakeBot(members)))),
  );
});

describe('makeEdgeDiscordBot', () => {
  class MockEdgeHttpClient extends EdgeHttpClient {
    readonly requests: ({ path: string } & EdgeRequestArgs)[] = [];
    constructor(private readonly _answer: unknown) {
      super('http://edge.test');
    }

    override async request(_ctx: Context, path: string, args: EdgeRequestArgs): Promise<unknown> {
      this.requests.push({ path, ...args });
      return this._answer;
    }
  }

  it.effect('posts actions to the bot route and searches its members', () =>
    Effect.gen(function* () {
      const actions = new MockEdgeHttpClient({ channelId: 'c1', messageId: 'm1' });
      const posted = yield* makeEdgeDiscordBot(actions).act(BOT, {
        kind: 'react',
        channelId: 'c1',
        messageId: 'm0',
        emoji: '\u{1F44D}',
      });
      expect(posted).toEqual({ channelId: 'c1', messageId: 'm1' });
      expect(actions.requests).toEqual([
        {
          path: '/discord/bots/app-1/actions',
          method: 'POST',
          body: {
            spaceId: 'space-1',
            channel: 'echo://space-1/channel-1',
            action: { kind: 'react', channelId: 'c1', messageId: 'm0', emoji: '\u{1F44D}' },
          },
        },
      ]);

      const search = new MockEdgeHttpClient({ members: [{ userId: '1', username: 'rich' }] });
      expect(yield* makeEdgeDiscordBot(search).findMembers(BOT, 'ri')).toEqual([{ userId: '1', username: 'rich' }]);
      expect(search.requests[0]).toEqual({
        path: '/discord/bots/app-1/members?spaceId=space-1&query=ri',
        method: 'GET',
      });
    }),
  );
});
