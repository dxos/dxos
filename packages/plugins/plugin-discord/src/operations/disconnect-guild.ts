//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { type Discord } from '../types';
import { DisconnectGuild } from './definitions';

const handler: Operation.WithHandler<typeof DisconnectGuild> = DisconnectGuild.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ bot }) {
      const obj = (yield* Database.load(bot)) as Discord.Bot;
      Obj.change(obj, (obj) => {
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
