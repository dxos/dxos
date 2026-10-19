//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Agent from '@dxos/assistant/Agent';
import { Channel } from '@dxos/types';

import { DiscordAgentSetup, DiscordChannelProperties } from '#containers';
import { DiscordChannel } from '#types';

import { DISCORD_AGENT_COMPANION } from '../constants.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      // Rendered wherever a channel's properties are shown, including the agent's channel list.
      Surface.create({
        id: 'discordChannelProperties',
        filter: AppSurface.object(
          AppSurface.ObjectProperties,
          Channel.Channel,
          (data) => data.subject.backend.kind === DiscordChannel.BACKEND_KIND,
        ),
        component: DiscordChannelProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      // Beside the agent: sign in to Discord, install the bot in a server, route channels to the agent.
      Surface.create({
        id: 'discordAgentSetup',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, DISCORD_AGENT_COMPANION),
          AppSurface.companion(AppSurface.Article, Agent.Agent),
        ),
        component: DiscordAgentSetup,
        props: ({ role, data: { companionTo } }) => ({ role, agent: companionTo }),
      }),
    ]),
  ),
);
