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
 * or handle; else the one guild member whose username or nickname is the handle.
 */
export const resolveUser = Effect.fnUntraced(function* (bot: DiscordBot.Bot, to: string) {
  const name = to.trim().replace(/^@/, '');
  if (SNOWFLAKE.test(name)) {
    return name;
  }

  const wanted = name.toLowerCase();
  const people = yield* Database.query(Query.select(Filter.type(Person.Person))).run.pipe(Effect.orDie);
  for (const person of people) {
    const userId = person.identities?.find(({ label }) => label === 'discord')?.value;
    if (!userId) {
      continue;
    }
    const names = [
      person.fullName,
      person.preferredName,
      person.nickname,
      ...(person.identities ?? []).map(({ value }) => value),
    ];
    if (names.some((candidate) => candidate?.trim().toLowerCase() === wanted)) {
      return userId;
    }
  }

  const service = yield* DiscordBot.DiscordBotService;
  const members = yield* service.findMembers(bot, name);
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
