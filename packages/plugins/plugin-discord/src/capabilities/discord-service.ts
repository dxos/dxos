//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { type EdgeHttpClient, EdgeHttpClientService } from '@dxos/edge-client';

import { DiscordService } from '#types';

import { callBotRoute } from '../services/bot-gateway.ts';

const ChannelsAnswer = Schema.Struct({ channels: Schema.Array(DiscordService.Channel) });
const MessagesAnswer = Schema.Struct({ messages: Schema.Array(DiscordService.Message) });

/** {@link DiscordService.Service} over EDGE's `/discord/bots/:applicationId` routes, signed with the user's identity. */
export const makeEdgeDiscordService = (edge: EdgeHttpClient): DiscordService.Service => {
  const toError = (cause: Error) => new DiscordService.DiscordServiceError({ message: cause.message, cause });
  return {
    listChannels: ({ applicationId, spaceId }) =>
      callBotRoute(
        edge,
        applicationId,
        `/channels?${new URLSearchParams({ spaceId }).toString()}`,
        { method: 'GET' },
        ChannelsAnswer,
      ).pipe(
        Effect.map(({ channels }) => channels),
        Effect.mapError(toError),
      ),
    fetchMessages: ({ applicationId, spaceId }, { channelId, after, limit }) =>
      callBotRoute(
        edge,
        applicationId,
        `/messages?${new URLSearchParams({ spaceId, channelId, after, limit: String(limit) }).toString()}`,
        { method: 'GET' },
        MessagesAnswer,
      ).pipe(
        Effect.map(({ messages }) => messages),
        Effect.mapError(toError),
      ),
  };
};

const DiscordServiceLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeHttpClientService],
    provides: [DiscordService.DiscordService],
  },
  () => Layer.effect(DiscordService.DiscordService, EdgeHttpClientService.pipe(Effect.map(makeEdgeDiscordService))),
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, DiscordServiceLayerSpec)),
);
