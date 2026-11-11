//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Agent } from '@dxos/assistant/Agent';
import { Database, Filter, Query, type Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import { Person } from '@dxos/types';

import { DiscordBot, DiscordChannel } from '#types';

/** The bot that serves the agent's Discord channels; an agent is in Discord through one bot. */
export const agentBot = Effect.fnUntraced(function* (agentRef: Ref.Ref<Agent>) {
  const agent = yield* Database.load(agentRef);
  const { db } = yield* Database.Service;
  for (const channel of yield* AgentChannels.loadChannels(agent)) {
    if (channel.backend.kind !== DiscordChannel.BACKEND_KIND) {
      continue;
    }
    const config = yield* Database.load(channel.backend.config).pipe(Effect.orElseSucceed(() => undefined));
    if (DiscordChannel.instanceOf(config)) {
      return {
        applicationId: config.applicationId,
        spaceId: db.spaceId,
        channel: EID.make({ spaceId: db.spaceId, entityId: channel.id }),
      } satisfies DiscordBot.Bot;
    }
  }
  return yield* Effect.fail(new DiscordBot.DiscordBotError({ message: 'The agent is not in any Discord channel.' }));
});

/**
 * The Discord user id `to` names, for a direct message, which Discord accepts only by id: an id (or a mention of one)
 * as is; else the account the contacts of that name record (`discord` identities, an id or a handle an agent kept from
 * a message), which must be one account; else the one guild member of exactly that username or nickname. Never a guess:
 * a partial match, or contacts that name different accounts, are refused with the candidates, since a wrong match
 * messages someone else.
 */
export const resolveUser = Effect.fnUntraced(function* (bot: DiscordBot.Bot, to: string) {
  const asked = DiscordBot.bareName(to);
  if (DiscordBot.isUserId(asked)) {
    return asked;
  }

  const service = yield* DiscordBot.DiscordBotService;
  const fail = (message: string) =>
    Effect.fail(
      new DiscordBot.DiscordBotError({
        message: `${message} Pass their user id instead, as the message header gives it (from, mentions).`,
      }),
    );
  const listed = (members: readonly DiscordBot.Member[]) =>
    members.map(({ username, userId }) => `@${username} (${userId})`).join(', ');

  /** The one member whose username, else guild nickname, is exactly `name`, which is what Discord's search matches. */
  const member = Effect.fnUntraced(function* (name: string) {
    const found = yield* service.findMembers(bot, name);
    const wanted = name.toLowerCase();
    const byUsername = found.filter(({ username }) => username.toLowerCase() === wanted);
    const matches =
      byUsername.length > 0 ? byUsername : found.filter(({ displayName }) => displayName?.toLowerCase() === wanted);
    if (matches.length === 1) {
      return matches[0].userId;
    }
    return yield* matches.length > 1
      ? fail(`${name} could be any of ${listed(matches)}.`)
      : fail(`No Discord member is called ${name}${found.length > 0 ? `; similar: ${listed(found)}` : ''}.`);
  });

  // Only a contact's Discord identities name a Discord account; another platform's handle names someone else there.
  const wanted = asked.toLowerCase();
  const people = yield* Database.query(Query.select(Filter.type(Person.Person))).run.pipe(Effect.orDie);
  const identities = new Set(
    people.flatMap((person) => {
      const discord = (person.identities ?? [])
        .filter(({ label }) => label?.toLowerCase() === 'discord')
        .map(({ value }) => DiscordBot.bareName(value).toLowerCase())
        .filter((value) => value.length > 0);
      const names = [person.fullName, person.preferredName, person.nickname, ...discord];
      return names.some((name) => name?.trim().toLowerCase() === wanted) ? discord : [];
    }),
  );
  if (identities.size === 0) {
    return yield* member(asked);
  }

  const userIds = new Set<string>();
  for (const identity of identities) {
    userIds.add(DiscordBot.isUserId(identity) ? identity : yield* member(identity));
  }
  if (userIds.size > 1) {
    return yield* fail(`${to} names contacts with different Discord accounts: ${[...userIds].join(', ')}.`);
  }
  const [userId] = userIds;
  return userId;
});
