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

/** A Discord user id (a snowflake): what the message header names a sender by. */
const SNOWFLAKE = /^\d{15,21}$/;

/**
 * The Discord user a person names: a user id as is; else a contact's Discord identity, matched by name, nickname
 * or Discord handle; else the one guild member whose username or nickname is the handle.
 *
 * A contact's Discord identity is a user id only when it is a bare snowflake: an agent recording a person from a
 * message (`@richburdon`) may keep their handle there instead, and Discord refuses a direct message to anything but an
 * id, so such a handle is looked up among the members, and only a member of exactly that name will do.
 */
export const resolveUser = Effect.fnUntraced(function* (bot: DiscordBot.Bot, to: string) {
  const asked = to.trim().replace(/^@/, '');
  if (SNOWFLAKE.test(asked)) {
    return asked;
  }

  const wanted = asked.toLowerCase();
  const people = yield* Database.query(Query.select(Filter.type(Person.Person))).run.pipe(Effect.orDie);
  // Every contact the name matches, not the first: a handle on one must not hide an id on another.
  const identities = new Set<string>();
  for (const person of people) {
    const identity = person.identities?.find(({ label }) => label === 'discord')?.value.trim();
    if (!identity) {
      continue;
    }
    // Only the Discord identity stands for a Discord handle; another platform's handle names someone else there.
    const names = [person.fullName, person.preferredName, person.nickname, identity.replace(/^@/, '')];
    if (names.some((candidate) => candidate?.trim().toLowerCase() === wanted)) {
      identities.add(identity);
    }
  }

  const ids = [...identities].filter((identity) => SNOWFLAKE.test(identity));
  const handles = [
    ...new Set(
      [...identities]
        .filter((identity) => !SNOWFLAKE.test(identity))
        .map((identity) => identity.replace(/^@/, '').toLowerCase()),
    ),
  ];
  if (ids.length > 1) {
    return yield* Effect.fail(
      new DiscordBot.DiscordBotError({ message: `${to} could be any of the contacts with ids ${ids.join(', ')}.` }),
    );
  }
  if (ids.length === 1) {
    return ids[0];
  }

  const service = yield* DiscordBot.DiscordBotService;
  if (handles.length > 1) {
    const listed = handles.map((handle) => `@${handle}`).join(', ');
    return yield* Effect.fail(new DiscordBot.DiscordBotError({ message: `${to} could be any of ${listed}.` }));
  }
  if (handles.length === 1) {
    // A handle on record names one account: a member whose name only starts with it is someone else. It may be a
    // display name (EDGE writes a mention as `@<global name>`), which counts only when one member has it.
    const [handle] = handles;
    const members = yield* service.findMembers(bot, handle);
    const byUsername = members.filter(({ username }) => username.toLowerCase() === handle);
    const candidates =
      byUsername.length > 0 ? byUsername : members.filter(({ displayName }) => displayName?.toLowerCase() === handle);
    if (candidates.length === 0) {
      return yield* Effect.fail(
        new DiscordBot.DiscordBotError({ message: `${to}'s Discord handle @${handle} names no member.` }),
      );
    }
    if (candidates.length > 1) {
      const listed = candidates.map(({ username }) => `@${username}`).join(', ');
      return yield* Effect.fail(
        new DiscordBot.DiscordBotError({ message: `${to}'s Discord handle @${handle} could be any of ${listed}.` }),
      );
    }
    return candidates[0].userId;
  }

  const members = yield* service.findMembers(bot, asked);
  const exact = members.filter(
    ({ username, displayName }) => username.toLowerCase() === wanted || displayName?.toLowerCase() === wanted,
  );
  const [match, ...others] = exact.length > 0 ? exact : members;
  if (!match) {
    return yield* Effect.fail(new DiscordBot.DiscordBotError({ message: `No Discord member is called ${to}.` }));
  }
  if (others.length > 0) {
    const names = [match, ...others].map(({ username }) => `@${username}`).join(', ');
    return yield* Effect.fail(new DiscordBot.DiscordBotError({ message: `${to} could be any of ${names}.` }));
  }
  return match.userId;
});
