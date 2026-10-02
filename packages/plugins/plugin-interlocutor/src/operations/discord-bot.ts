//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Context } from '@dxos/context';
import { Database, type Ref } from '@dxos/echo';
import { EdgeHttpClientService, type EdgeRequestArgs } from '@dxos/edge-client';
import { EID } from '@dxos/keys';

import { type DiscordBinding, DiscordOperation } from '#types';

import { InterlocutorOperationError } from './errors.ts';

/** EDGE route of the gateway host for one bot, keyed by its Discord application id. */
export const discordBotPath = (applicationId: string) => `/compute/discord/bots/${encodeURIComponent(applicationId)}`;

export type BotTarget = {
  applicationId: string;
  spaceId: string;
  /** Absolute URI of the binding object, which EDGE reads the rest of the config from. */
  binding: string;
};

/** Loads the binding and resolves what EDGE needs to address its bot. */
export const resolveBotTarget = (
  ref: Ref.Ref<DiscordBinding.DiscordBinding>,
): Effect.Effect<BotTarget, InterlocutorOperationError, Database.Service> =>
  Effect.gen(function* () {
    const binding = yield* Database.load(ref).pipe(Effect.orDie);
    if (!binding.applicationId) {
      return yield* Effect.fail(new InterlocutorOperationError({ message: 'The binding has no application id.' }));
    }
    const spaceId = yield* Database.spaceId;
    return {
      applicationId: binding.applicationId,
      spaceId,
      binding: EID.make({ spaceId, entityId: binding.id }),
    };
  });

/** Calls a bot route and decodes the `DiscordBotStatus` EDGE answers every verb with. */
export const callBot = (
  applicationId: string,
  args: EdgeRequestArgs,
): Effect.Effect<DiscordOperation.BotStatus, InterlocutorOperationError, EdgeHttpClientService> =>
  Effect.gen(function* () {
    const edge = yield* EdgeHttpClientService;
    const data = yield* Effect.tryPromise({
      try: () => edge.request(Context.default(), discordBotPath(applicationId), args),
      catch: (cause) => new InterlocutorOperationError({ message: 'EDGE Discord bot request failed.', cause }),
    });
    return yield* Schema.decodeUnknownEffect(DiscordOperation.BotStatus)(data).pipe(
      Effect.mapError(
        (cause) => new InterlocutorOperationError({ message: 'Unexpected Discord bot status from EDGE.', cause }),
      ),
    );
  });
