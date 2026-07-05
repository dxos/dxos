//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { Game } from '@dxos/plugin-game/types';

import { ChessComAccount, ChessComOperation } from '../types';

export default ChessComOperation.ClearSyncedGames.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ account: accountRef }) {
      const account = yield* Database.load(accountRef);
      const oldFeed = yield* Database.load(account.games);

      const games = yield* Feed.query(oldFeed, Filter.type(Game)).run;
      if (games.length === 0) {
        return { removed: 0 };
      }

      const newFeed = yield* Database.add(Feed.make());
      Obj.setParent(newFeed, account);
      Obj.update(account, (account) => {
        account.games = Ref.make(newFeed);
      });

      yield* Database.remove(oldFeed);
      yield* Database.flush();

      return { removed: games.length };
    }),
  ),
  Operation.opaqueHandler,
);
