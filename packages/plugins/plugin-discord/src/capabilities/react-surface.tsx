//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Channel } from '@dxos/types';

import { DiscordChannelProperties } from '#containers';
import { DiscordChannel } from '#types';

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
    ]),
  ),
);
