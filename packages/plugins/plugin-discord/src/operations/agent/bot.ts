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

/** An account found, or why there is none. */
type Lookup = { readonly userId: string } | { readonly reason: string };

/**
 * The Discord user id `to` names, for a direct message, which Discord accepts only by id. Never a guess, since a wrong
 * match messages someone else:
 * - an id, as the message header gives it (bare or as a mention), as is;
 * - `@` before digits is an id unless a member's username is those digits;
 * - else the account the contacts of that name record (their `discord` identities: ids, unless a member's username is
 *   those digits, or handles an agent kept, which must be a member's exact username), which must be one account;
 * - else the one member whose username or display name (their guild nickname, else their global name) is exactly that
 *   name; Discord's search finds a member by username or nickname only.
 * Anything else is refused with the candidates.
 */
export const resolveUser = Effect.fnUntraced(function* (bot: DiscordBot.Bot, to: string) {
  const service = yield* DiscordBot.DiscordBotService;
  const fail = (
    message: string,
    hint = ' Pass their user id instead, as the message header gives it (from, mentions).',
  ) => Effect.fail(new DiscordBot.DiscordBotError({ message: `${message}${hint}` }));
  const listed = (members: readonly DiscordBot.Member[]) =>
    members.map(({ username, userId }) => `@${username} (${userId})`).join(', ');

  /**
   * The account `value` names: given by the agent (`stored` false) or recorded on a contact (`stored` true).
   * - An id as the header writes it (bare, or as a mention), given by the agent, as is. On record, the contact schema
   *   cannot tell it from a numeric username, so it is refused when a member has those digits as their username.
   * - `@` before digits, given by the agent, likewise. On record it is a handle, never an id.
   * - A name: on record, a handle, which must be a member's exact username; given by the agent, a username or display
   *   name (Discord's search finds a guild nickname). Two accounts that match are refused.
   */
  const account = Effect.fnUntraced(function* (value: string, stored: boolean) {
    const id = DiscordBot.explicitUserId(value);
    if (id && !stored) {
      const lookup: Lookup = { userId: id };
      return lookup;
    }
    const name = DiscordBot.bareName(value);
    const found = yield* service.findMembers(bot, name);
    const wanted = name.toLowerCase();
    const byUsername = found.filter(({ username }) => username.toLowerCase() === wanted);
    if (DiscordBot.isUserId(name) && (id !== undefined || !stored)) {
      // Digits that may be an id: their id, unless the digits are also someone's username.
      const lookup: Lookup =
        byUsername.length === 0
          ? { userId: name }
          : { reason: `${value} could be the user id ${name} or ${listed(byUsername)}.` };
      return lookup;
    }
    const exact = stored
      ? byUsername
      : found.filter(
          ({ username, displayName }) => username.toLowerCase() === wanted || displayName?.toLowerCase() === wanted,
        );
    const accounts = [...new Map(exact.map((member) => [member.userId, member])).values()];
    if (accounts.length === 1) {
      const lookup: Lookup = { userId: accounts[0].userId };
      return lookup;
    }
    const similar = found.length > 0 ? `; similar: ${listed(found)}` : '';
    const lookup: Lookup = {
      reason:
        accounts.length > 1
          ? `${name} could be any of ${listed(accounts)}.`
          : `No Discord member ${stored ? 'has the username' : 'is called'} ${name}${similar}.`,
    };
    return lookup;
  });

  const asked = DiscordBot.bareName(to);
  if (asked === '') {
    return yield* fail('Name the person to message, or pass their user id from the message header.', '');
  }
  if (DiscordBot.explicitUserId(to) || DiscordBot.isUserId(asked)) {
    const found = yield* account(to, false);
    return 'userId' in found ? found.userId : yield* fail(found.reason);
  }

  // The Discord identities of every contact the name matches, each with the contacts that record it, and the matching
  // contacts that record none.
  const wanted = asked.toLowerCase();
  const people = yield* Database.query(Query.select(Filter.type(Person.Person))).run.pipe(Effect.orDie);
  const identities = new Map<string, { value: string; contacts: Set<string> }>();
  const unidentified: string[] = [];
  for (const person of people) {
    const discord = DiscordBot.discordIdentities(person);
    const names = [person.fullName, person.preferredName, person.nickname, ...discord.map(DiscordBot.bareName)];
    if (!names.some((name) => name?.trim().toLowerCase() === wanted)) {
      continue;
    }
    if (discord.length === 0) {
      unidentified.push(person.fullName || person.preferredName || person.nickname || asked);
    }
    for (const value of discord) {
      const entry = identities.get(value.toLowerCase()) ?? { value, contacts: new Set<string>() };
      entry.contacts.add(person.fullName || person.preferredName || person.nickname || asked);
      identities.set(value.toLowerCase(), entry);
    }
  }
  if (identities.size === 0) {
    const found = yield* account(asked, false);
    return 'userId' in found ? found.userId : yield* fail(found.reason);
  }

  // Every account those contacts record must be the same one: a guess could message the wrong person.
  const accounts = new Map<string, Set<string>>();
  const unresolved: string[] = [];
  for (const { value, contacts } of identities.values()) {
    const found = yield* account(value, true);
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
  if (unidentified.length > 0) {
    // The one account on record may not be the contact meant: another of that name has none.
    return yield* fail(
      `${to} also names ${unidentified.join(', ')}, with no Discord identity on record; the account on record is ${named}.`,
    );
  }
  const [[userId]] = accounts;
  return userId;
});
