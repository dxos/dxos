//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Agent from '@dxos/compute/Agent';
import * as ConnectorSurface from '@dxos/plugin-connector/ConnectorSurface';
import { Channel } from '@dxos/types';

import { DiscordAgentSetup, DiscordChannelProperties, DiscordConnectionSetup } from '#containers';
import { DiscordChannel } from '#types';

import { DISCORD_AGENT_COMPANION, DISCORD_USER_PROVIDER_ID } from '../constants.ts';

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
      // The Discord sign-in's own section on its connection page: indexing servers into the space's memory.
      Surface.create({
        id: 'discordConnectionSetup',
        filter: Surface.makeFilter(
          ConnectorSurface.ConnectionSection,
          ({ connection }) => connection.connectorId === DISCORD_USER_PROVIDER_ID,
        ),
        component: DiscordConnectionSetup,
        props: ({ data: { connection } }) => ({ connection }),
      }),
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
