//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { type Discord, DiscordOperation } from '../types';

const handler: Operation.WithHandler<typeof DiscordOperation.SetToken> = DiscordOperation.SetToken.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ bot, token }) {
      const obj = (yield* Database.load(bot)) as Discord.Bot;
      Obj.update(obj, (obj) => {
        const mutable = obj as Obj.Mutable<typeof obj>;
        mutable.token = token;
      });
      return obj;
    }),
  ),
);

export default handler;
