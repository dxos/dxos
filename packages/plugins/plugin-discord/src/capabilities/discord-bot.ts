//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { EdgeHttpClientService } from '@dxos/edge-client';

import { DiscordBot } from '#types';

import { makeEdgeDiscordBot } from '../services/edge-discord-bot.ts';

const DiscordBotLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeHttpClientService],
    provides: [DiscordBot.DiscordBotService],
  },
  () => Layer.effect(DiscordBot.DiscordBotService, EdgeHttpClientService.pipe(Effect.map(makeEdgeDiscordBot))),
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, DiscordBotLayerSpec)),
);
