//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { Chess } from '@dxos/plugin-chess/types';
import { Game } from '@dxos/plugin-game/types';

import { ChessComOperation } from '../types';

export default ChessComOperation.ClearSyncedGames.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ account: accountRef }) {
      const account = yield* Database.load(accountRef);
      const oldFeed = yield* Database.load(account.games);

      const games = yield* Feed.query(oldFeed, Filter.type(Game.Game)).run;
      if (games.length === 0) {
        return { removed: 0 };
      }

      // Each Game was appended alongside its Chess.State variant (see sync-games); both must be
      // removed explicitly, since removing the feed only tombstones the feed object and would
      // otherwise leave these entities orphaned and the removed count misleading.
      const states = yield* Feed.query(oldFeed, Filter.type(Chess.State)).run;

      const newFeed = yield* Database.add(Feed.make());
      Obj.setParent(newFeed, account);
      Obj.update(account, (account) => {
        account.games = Ref.make(newFeed);
      });

      yield* Feed.remove(oldFeed, [...games, ...states]);
      yield* Database.remove(oldFeed);
      yield* Database.flush();

      return { removed: games.length };
    }),
  ),
  Operation.opaqueHandler,
);
