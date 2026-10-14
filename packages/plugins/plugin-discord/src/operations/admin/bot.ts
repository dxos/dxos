//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, type Ref } from '@dxos/echo';
import { type AccessToken } from '@dxos/link';

import { DiscordAdminOperation } from '#types';

import { appEdgeClient, callBotRoute } from '../../services/bot-gateway.ts';

/** The query naming the space and the bot-token object, which EDGE reads to act as the bot. */
export const botQuery = Effect.fnUntraced(function* (accessToken?: Ref.Ref<AccessToken.AccessToken>) {
  const { db } = yield* Database.Service;
  const params = new URLSearchParams({ spaceId: db.spaceId });
  if (accessToken) {
    const token = yield* Database.load(accessToken);
    params.set('accessToken', token.id);
  }
  return { spaceId: db.spaceId, query: `?${params.toString()}` };
});

/** Calls one of the bot's admin routes as the signed-in identity. */
export const callAdminRoute = <A, I>(
  applicationId: string,
  route: string,
  args: Parameters<typeof callBotRoute>[3],
  schema: Schema.Codec<A, I>,
) => Effect.flatMap(appEdgeClient, (edge) => callBotRoute(edge, applicationId, route, args, schema));

export const GuildsAnswer = Schema.Struct({ guilds: Schema.Array(DiscordAdminOperation.Guild) });
export const ChannelsAnswer = Schema.Struct({ channels: Schema.Array(DiscordAdminOperation.GuildChannel) });
export const BindingsAnswer = Schema.Struct({ bindings: Schema.Array(DiscordAdminOperation.ChannelBinding) });
