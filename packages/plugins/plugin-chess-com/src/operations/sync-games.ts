//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Array from 'effect/Array';
import * as Predicate from 'effect/Predicate';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Chess } from '@dxos/plugin-chess/types';
import { Game } from '@dxos/plugin-game/types';

import { type RemoteGame, fetchAllGames, fetchPlayer } from '../services';
import { ChessComAccount, ChessComOperation } from '../types';

const gameForeignId = (uuid: string): string => `game/${uuid}`;

const makeGameFromRemote = (remote: RemoteGame) =>
  Obj.make(Game, {
    name: `${remote.white.username} vs ${remote.black.username}`,
    players: [
      { role: 'white', name: remote.white.username },
      { role: 'black', name: remote.black.username },
    ],
    variant: Ref.make(Chess.make({ pgn: remote.pgn, fen: remote.fen })),
    [Obj.Meta]: { keys: [{ source: ChessComAccount.CHESS_COM_SOURCE, id: gameForeignId(remote.uuid) }] },
  });

export default ChessComOperation.SyncGames.pipe(
  Operation.withHandler(
    Effect.fn(
      function* ({ account: accountRef }) {
        const account = yield* Database.load(accountRef);
        const username = ChessComAccount.normalizeUsername(account.username);
        invariant(username, 'Chess.com username is required.');

        const gamesFeed = yield* Database.load(account.games);

        const profile = yield* fetchPlayer(username);
        // TODO(dmaretskyi): Make sure that no automerge mutations are written if data has not changed.
        ChessComAccount.applyProfile(account, profile);

        const remoteGames = yield* fetchAllGames(username);

        const existingGameIds = yield* Feed.query(gamesFeed, Filter.type(Game)).run.pipe(
          Effect.map((games) => games.map(ChessComAccount.getForeignKey)),
          Effect.map(Array.filter(Predicate.isNotUndefined)),
          Effect.map((ids) => new Set(ids)),
        );

        const newGames = remoteGames.filter((remote) => !existingGameIds.has(gameForeignId(remote.uuid)));
        if (newGames.length === 0) {
          return { appended: 0 };
        }

        const gameObjects = newGames.map(makeGameFromRemote);
        yield* Feed.append(gamesFeed, gameObjects);
        return { appended: gameObjects.length };
      },
      Effect.provide(FetchHttpClient.layer),
    ),
  ),
  Operation.opaqueHandler,
);
