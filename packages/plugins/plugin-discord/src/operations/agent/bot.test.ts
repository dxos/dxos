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

/** A guild member, with the nickname Discord's search matches; their display name is that, else their global name. */
type GuildMember = DiscordBot.Member & { nick?: string };

/**
 * A bot host whose guild has the given members. As Discord's member search does, a search returns those whose
 * username or guild nickname starts with it, never a global display name.
 */
const fakeBot = (members: GuildMember[]) =>
  Layer.succeed(DiscordBot.DiscordBotService, {
    act: () => Effect.die('Not acted in this test.'),
    findMembers: (_bot, query) =>
      Effect.succeed(
        members
          .filter(({ username, nick }) =>
            [username, nick].some((name) => name?.toLowerCase().startsWith(query.toLowerCase())),
          )
          .map(({ nick: _nick, ...member }) => member),
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
  it.effect('names the bot of the agent’s Discord channel', () =>
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
  const HINT = ' Pass their user id instead, as the message header gives it (from, mentions).';
  const members: GuildMember[] = [
    { userId: '111111111111111111', username: 'richburdon', displayName: 'Rich', nick: 'Rich' },
    { userId: '222222222222222222', username: 'richard', displayName: 'Richard', nick: 'Richard' },
    { userId: '333333333333333333', username: 'dima' },
    // A global display name only: Discord's search does not find it.
    { userId: '666666666666666666', username: 'rburdon', displayName: 'Rich Burdon' },
    // One member's username is another member's nickname.
    { userId: '777777777777777777', username: 'alex' },
    { userId: '888888888888888888', username: 'alexandra', displayName: 'alex', nick: 'alex' },
    // A numeric username, which `@` before digits could mean.
    { userId: '999999999999999999', username: '555555555555555555' },
  ];
  const withGuild = <A, E>(effect: Effect.Effect<A, E, Database.Service | DiscordBot.DiscordBotService>) =>
    effect.pipe(Effect.provide(Layer.merge(TestLayer, fakeBot(members))));

  it.effect('takes an id as the header gives it, else the one member of that username or nickname', () =>
    withGuild(
      Effect.gen(function* () {
        yield* Database.add(
          Obj.make(Person.Person, {
            fullName: 'Josiah Witt',
            nickname: 'josiah',
            identities: [{ label: 'discord', value: '444444444444444444' }],
          }),
        );
        yield* Database.flush();

        expect(yield* resolveUser(BOT, '123456789012345678')).toBe('123456789012345678');
        expect(yield* resolveUser(BOT, '<@123456789012345678>')).toBe('123456789012345678');
        expect(yield* resolveUser(BOT, '<@!123456789012345678>')).toBe('123456789012345678');
        expect(yield* resolveUser(BOT, 'Josiah Witt')).toBe('444444444444444444');
        expect(yield* resolveUser(BOT, '@josiah')).toBe('444444444444444444');
        expect(yield* resolveUser(BOT, '@richburdon')).toBe('111111111111111111');
        // A nickname is what the search matches besides the username.
        expect(yield* resolveUser(BOT, 'rich')).toBe('111111111111111111');
        expect(yield* resolveUser(BOT, 'dima')).toBe('333333333333333333');
      }),
    ),
  );

  it.effect('reads @ before digits as an id unless a member has those digits as their username', () =>
    withGuild(
      Effect.gen(function* () {
        expect(yield* resolveUser(BOT, '@123456789012345678')).toBe('123456789012345678');
        const numeric = yield* resolveUser(BOT, '@555555555555555555').pipe(Effect.flip);
        expect(numeric.message).toBe(
          `@555555555555555555 could be the user id 555555555555555555 or @555555555555555555 (999999999999999999).${HINT}`,
        );
      }),
    ),
  );

  it.effect('never guesses: partial matches, a name nobody has and two accounts of one name are refused', () =>
    withGuild(
      Effect.gen(function* () {
        const partial = yield* resolveUser(BOT, 'ric').pipe(Effect.flip);
        expect(partial.message).toBe(
          `No Discord member is called ric; similar: @richburdon (111111111111111111), @richard (222222222222222222).${HINT}`,
        );
        // The only member whose name starts with it is still someone else.
        const lone = yield* resolveUser(BOT, 'dim').pipe(Effect.flip);
        expect(lone.message).toBe(`No Discord member is called dim; similar: @dima (333333333333333333).${HINT}`);
        const nobody = yield* resolveUser(BOT, 'zed').pipe(Effect.flip);
        expect(nobody.message).toBe(`No Discord member is called zed.${HINT}`);
        // One member's username and another's nickname.
        const alex = yield* resolveUser(BOT, 'alex').pipe(Effect.flip);
        expect(alex.message).toBe(
          `alex could be any of @alex (777777777777777777), @alexandra (888888888888888888).${HINT}`,
        );
        // An empty name would match a contact with no name at all.
        for (const empty of ['', ' @ ']) {
          expect((yield* resolveUser(BOT, empty).pipe(Effect.flip)).message).toBe(
            'Name the person to message, or pass their user id from the message header.',
          );
        }
      }),
    ),
  );

  it.effect('takes a contact’s Discord identities only, and a handle on record only as a username', () =>
    withGuild(
      Effect.gen(function* () {
        // As an agent records someone it was asked to message: their handle where the user id belongs.
        yield* Database.add(
          Obj.make(Person.Person, { fullName: 'richburdon', identities: [{ label: 'discord', value: 'richburdon' }] }),
        );
        yield* Database.add(
          Obj.make(Person.Person, { fullName: 'Dmytro', identities: [{ label: 'Discord', value: '@dima' }] }),
        );
        yield* Database.add(
          Obj.make(Person.Person, {
            fullName: 'Bob',
            identities: [
              { label: 'twitter', value: '@bobby' },
              { label: 'discord', value: '222222222222222222' },
            ],
          }),
        );
        // Recorded with a nickname: nobody's username, so no account.
        yield* Database.add(
          Obj.make(Person.Person, { fullName: 'Rick', identities: [{ label: 'discord', value: 'Rich' }] }),
        );
        // Digits on record: an id, unless a member has them as their username; `@` before them, a handle only.
        yield* Database.add(
          Obj.make(Person.Person, {
            fullName: 'Numeral',
            identities: [{ label: 'discord', value: '555555555555555555' }],
          }),
        );
        yield* Database.add(
          Obj.make(Person.Person, {
            fullName: 'Handle',
            identities: [{ label: 'discord', value: '@123456789012345678' }],
          }),
        );
        yield* Database.flush();

        expect(yield* resolveUser(BOT, 'richburdon')).toBe('111111111111111111');
        expect(yield* resolveUser(BOT, '@richburdon')).toBe('111111111111111111');
        expect(yield* resolveUser(BOT, 'Dmytro')).toBe('333333333333333333');
        // Not Bob's Discord account: a Twitter handle names nobody on Discord.
        const twitter = yield* resolveUser(BOT, '@bobby').pipe(Effect.flip);
        expect(twitter.message).toBe(`No Discord member is called bobby.${HINT}`);
        const numeral = yield* resolveUser(BOT, 'Numeral').pipe(Effect.flip);
        expect(numeral.message).toBe(
          `Numeral records the Discord identity "555555555555555555": 555555555555555555 could be the user id 555555555555555555 or @555555555555555555 (999999999999999999).${HINT}`,
        );
        // Nobody in the bot's guilds has that username, and it is not taken for an id either.
        const handle = yield* resolveUser(BOT, 'Handle').pipe(Effect.flip);
        expect(handle.message).toBe(
          `Handle records the Discord identity "@123456789012345678": No Discord member has the username 123456789012345678.${HINT}`,
        );
        const nick = yield* resolveUser(BOT, 'Rick').pipe(Effect.flip);
        expect(nick.message).toBe(
          `Rick records the Discord identity "Rich": No Discord member has the username Rich; similar: @richburdon (111111111111111111), @richard (222222222222222222).${HINT}`,
        );
      }),
    ),
  );

  it.effect('takes one account however many contacts record it, and refuses contacts that name different ones', () =>
    withGuild(
      Effect.gen(function* () {
        // The same person recorded twice, and with a handle then an id on one contact: one account.
        yield* Database.add(
          Obj.make(Person.Person, { fullName: 'Rich', identities: [{ label: 'discord', value: 'richburdon' }] }),
        );
        yield* Database.add(
          Obj.make(Person.Person, {
            fullName: 'Rich',
            identities: [
              { label: 'discord', value: 'richburdon' },
              { label: 'discord', value: '111111111111111111' },
            ],
          }),
        );
        // Two people called Kim, only one of them on Discord: the account on record may not be the one meant.
        yield* Database.add(
          Obj.make(Person.Person, { fullName: 'Kim', identities: [{ label: 'discord', value: '123456789012345678' }] }),
        );
        yield* Database.add(
          Obj.make(Person.Person, { fullName: 'Kim', identities: [{ label: 'email', value: 'kim@x.y' }] }),
        );
        // Two people called Sam on record.
        yield* Database.add(
          Obj.make(Person.Person, { fullName: 'Sam', identities: [{ label: 'discord', value: 'richard' }] }),
        );
        yield* Database.add(
          Obj.make(Person.Person, { fullName: 'Sam', identities: [{ label: 'discord', value: '333333333333333333' }] }),
        );
        yield* Database.flush();

        expect(yield* resolveUser(BOT, 'Rich')).toBe('111111111111111111');
        const kim = yield* resolveUser(BOT, 'Kim').pipe(Effect.flip);
        expect(kim.message).toBe(
          `Kim also names Kim, with no Discord identity on record; the account on record is Kim (123456789012345678).${HINT}`,
        );
        const sam = yield* resolveUser(BOT, 'Sam').pipe(Effect.flip);
        expect(sam.message).toBe(
          `Sam names contacts with different Discord accounts: Sam (222222222222222222), Sam (333333333333333333).${HINT}`,
        );
      }),
    ),
  );

  it.effect('cannot find a global display name, which Discord’s search does not match', () =>
    withGuild(
      Effect.gen(function* () {
        // As EDGE writes a mention in the text, `@<global name>`, kept as the person's Discord identity; the header's
        // id is what reaches them.
        yield* Database.add(
          Obj.make(Person.Person, {
            fullName: 'Rich Burdon',
            identities: [{ label: 'discord', value: '@Rich Burdon' }],
          }),
        );
        yield* Database.flush();

        const display = yield* resolveUser(BOT, 'Rich Burdon').pipe(Effect.flip);
        expect(display.message).toBe(
          `Rich Burdon records the Discord identity "@Rich Burdon": No Discord member has the username Rich Burdon.${HINT}`,
        );

        // Another contact of that name has an id; the unresolved one is still refused, naming the id it found.
        yield* Database.add(
          Obj.make(Person.Person, {
            fullName: 'Rich Burdon',
            identities: [{ label: 'discord', value: '666666666666666666' }],
          }),
        );
        yield* Database.flush();
        const mixed = yield* resolveUser(BOT, 'Rich Burdon').pipe(Effect.flip);
        expect(mixed.message).toBe(
          `Rich Burdon records the Discord identity "@Rich Burdon": No Discord member has the username Rich Burdon. Ids on record: Rich Burdon (666666666666666666).${HINT}`,
        );
      }),
    ),
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
        emoji: '👍',
      });
      expect(posted).toEqual({ channelId: 'c1', messageId: 'm1' });
      expect(actions.requests).toEqual([
        {
          path: '/discord/bots/app-1/actions',
          method: 'POST',
          body: {
            spaceId: 'space-1',
            channel: 'echo://space-1/channel-1',
            action: { kind: 'react', channelId: 'c1', messageId: 'm0', emoji: '👍' },
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
