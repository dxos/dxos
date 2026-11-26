//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type EdgeHttpClient } from '@dxos/edge-client';

import { DiscordBot } from '#types';

import { callBotRoute } from './bot-gateway.ts';

const MembersAnswer = Schema.Struct({ members: Schema.Array(DiscordBot.Member) });

/** {@link DiscordBot.Service} over EDGE's `/discord/bots/:applicationId` routes, signed with the user's identity. */
export const makeEdgeDiscordBot = (edge: EdgeHttpClient): DiscordBot.Service => {
  const toBotError = (cause: Error) => new DiscordBot.DiscordBotError({ message: cause.message, cause });
  return {
    act: ({ applicationId, spaceId, channel }, action) =>
      callBotRoute(
        edge,
        applicationId,
        '/actions',
        { method: 'POST', body: { spaceId, channel, action } },
        DiscordBot.ActionResult,
      ).pipe(Effect.mapError(toBotError)),
    findMembers: ({ applicationId, spaceId }, query) =>
      callBotRoute(
        edge,
        applicationId,
        `/members?${new URLSearchParams({ spaceId, query }).toString()}`,
        { method: 'GET' },
        MembersAnswer,
      ).pipe(
        Effect.map(({ members }) => members),
        Effect.mapError(toBotError),
      ),
  };
};
