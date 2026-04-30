//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { type Discord } from '../types';
import { SetToken } from './definitions';

const handler: Operation.WithHandler<typeof SetToken> = SetToken.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ bot, token }) {
      const obj = (yield* Database.load(bot)) as Discord.Bot;
      Obj.change(obj, (obj) => {
        const mutable = obj as Obj.Mutable<typeof obj>;
        mutable.token = token;
      });
      return obj;
    }),
  ),
);

export default handler;
