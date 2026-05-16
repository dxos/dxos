//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { type Discord, DiscordOperation } from '../types';

const handler: Operation.WithHandler<typeof DiscordOperation.DisconnectGuild> = DiscordOperation.DisconnectGuild.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ bot }) {
      const obj = (yield* Database.load(bot)) as Discord.Bot;
      Obj.update(obj, (obj) => {
        const mutable = obj as Obj.Mutable<typeof obj>;
        mutable.guildId = undefined;
        mutable.guildName = undefined;
        mutable.channels = [];
        mutable.status = 'disconnected';
      });
      return obj;
    }),
  ),
);

export default handler;
