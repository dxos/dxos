//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import * as Mode from '@dxos/plugin-agent/Mode';
import * as ModeOperation from '@dxos/plugin-agent/ModeOperation';

import { DiscordChannel, ShowAndTell, ShowAndTellOperation } from '#types';

const handler: Operation.WithHandler<typeof ShowAndTellOperation.EnableShowAndTell> =
  ShowAndTellOperation.EnableShowAndTell.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ agent: agentRef, channel: channelRef, discordChannelId }) {
        const agent = yield* Database.load(agentRef);
        const channel = yield* Database.load(channelRef);
        const config = yield* Database.load(channel.backend.config);
        if (!DiscordChannel.instanceOf(config)) {
          return yield* Effect.fail(
            new ShowAndTell.ShowAndTellError({ message: 'The channel is not backed by Discord.' }),
          );
        }

        Obj.update(config, (config) => {
          if (!config.channels.includes(discordChannelId)) {
            config.channels = [...config.channels, discordChannelId];
          }
          const curate = config.curate ?? [];
          if (!curate.includes(discordChannelId)) {
            config.curate = [...curate, discordChannelId];
          }
        });

        yield* ensureMode(agent);
        // Each Discord conversation's chat copies the skills of the agent's own chat, so the mode is set there once.
        const chat = yield* Agent.loadChat(agent);
        if (chat) {
          yield* Operation.invoke(ModeOperation.SwitchMode, { chat: Ref.make(chat), mode: ShowAndTell.MODE_NAME });
        }

        return {
          mode: ShowAndTell.MODE_NAME,
          channels: [...config.channels],
          curate: [...(config.curate ?? [])],
          switched: chat !== undefined,
        };
      }),
    ),
  );

export default handler;

/** The agent's show-and-tell mode, created beside its built-in modes; parented to the agent so it cascades with it. */
const ensureMode = Effect.fnUntraced(function* (agent: Agent.Agent) {
  const modes = yield* Database.query(Filter.and(Filter.type(Mode.Mode), Filter.childOf(agent))).run;
  const existing = modes.find((mode) => Obj.instanceOf(Mode.Mode, mode) && mode.name === ShowAndTell.MODE_NAME);
  if (existing) {
    return existing;
  }
  return yield* Database.add(
    Obj.make(Mode.Mode, {
      name: ShowAndTell.MODE_NAME,
      description: 'Files every link shared in the channel as a table row and summarizes what was shared.',
      skills: [Ref.fromURI(Skill.registryURI(ShowAndTell.SKILL_KEY))],
      [Obj.Parent]: agent,
    }),
  );
});
