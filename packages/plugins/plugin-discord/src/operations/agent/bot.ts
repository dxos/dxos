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

/** A member found, or why there is none. */
type MemberLookup = { readonly userId: string } | { readonly reason: string };

/**
 * The Discord user id `to` names, for a direct message, which Discord accepts only by id: an id (or a mention of one)
 * as is; else the account the contacts of that name record (`discord` identities, an id or a handle an agent kept from
 * a message), which must be one account; else the one guild member of exactly that username or nickname. Never a guess:
 * a partial match, or contacts that name different accounts, are refused with the candidates, since a wrong match
 * messages someone else.
 */
export const resolveUser = Effect.fnUntraced(function* (bot: DiscordBot.Bot, to: string) {
  const service = yield* DiscordBot.DiscordBotService;
  const fail = (
    message: string,
    hint = ' Pass their user id instead, as the message header gives it (from, mentions).',
  ) => Effect.fail(new DiscordBot.DiscordBotError({ message: `${message}${hint}` }));
  const listed = (members: readonly DiscordBot.Member[]) =>
    members.map(({ username, userId }) => `@${username} (${userId})`).join(', ');

  const asked = DiscordBot.bareName(to);
  if (asked === '') {
    return yield* fail('Name the person to message, or pass their user id from the message header.', '');
  }
  if (DiscordBot.isUserId(asked)) {
    return asked;
  }

  /**
   * The one member whose username, else display name, is exactly `name` (Discord's search matches a username or a guild
   * nickname), or why there is none.
   */
  const member = Effect.fnUntraced(function* (name: string) {
    const found = yield* service.findMembers(bot, name);
    const wanted = name.toLowerCase();
    const byUsername = found.filter(({ username }) => username.toLowerCase() === wanted);
    const matches =
      byUsername.length > 0 ? byUsername : found.filter(({ displayName }) => displayName?.toLowerCase() === wanted);
    if (matches.length === 1) {
      const lookup: MemberLookup = { userId: matches[0].userId };
      return lookup;
    }
    const lookup: MemberLookup = {
      reason:
        matches.length > 1
          ? `${name} could be any of ${listed(matches)}.`
          : `No Discord member is called ${name}${found.length > 0 ? `; similar: ${listed(found)}` : ''}.`,
    };
    return lookup;
  });

  // The Discord identities of every contact the name matches, each with the contacts that record it.
  const wanted = asked.toLowerCase();
  const people = yield* Database.query(Query.select(Filter.type(Person.Person))).run.pipe(Effect.orDie);
  const identities = new Map<string, { value: string; contacts: Set<string> }>();
  for (const person of people) {
    const discord = DiscordBot.discordIdentities(person);
    const names = [person.fullName, person.preferredName, person.nickname, ...discord];
    if (!names.some((name) => name?.trim().toLowerCase() === wanted)) {
      continue;
    }
    for (const value of discord) {
      const entry = identities.get(value.toLowerCase()) ?? { value, contacts: new Set<string>() };
      entry.contacts.add(person.fullName || person.preferredName || person.nickname || asked);
      identities.set(value.toLowerCase(), entry);
    }
  }
  if (identities.size === 0) {
    const found = yield* member(asked);
    return 'userId' in found ? found.userId : yield* fail(found.reason);
  }

  // Every account those contacts record must be the same one: a guess could message the wrong person.
  const accounts = new Map<string, Set<string>>();
  const unresolved: string[] = [];
  for (const { value, contacts } of identities.values()) {
    const found: MemberLookup = DiscordBot.isUserId(value) ? { userId: value } : yield* member(value);
    if ('userId' in found) {
      accounts.set(found.userId, new Set([...(accounts.get(found.userId) ?? []), ...contacts]));
    } else {
      unresolved.push(`${[...contacts].join(', ')} records the Discord identity "${value}": ${found.reason}`);
    }
  }
  const named = [...accounts].map(([userId, contacts]) => `${[...contacts].join(', ')} (${userId})`).join(', ');
  if (unresolved.length > 0) {
    return yield* fail(`${unresolved.join(' ')}${accounts.size > 0 ? ` Ids on record: ${named}.` : ''}`);
  }
  if (accounts.size > 1) {
    return yield* fail(`${to} names contacts with different Discord accounts: ${named}.`);
  }
  const [[userId]] = accounts;
  return userId;
});
