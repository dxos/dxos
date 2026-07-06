//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Operation } from '@dxos/compute';
import { Database, Filter, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Game, GameVariantMismatchError, loadGame } from '@dxos/plugin-game/types';

import * as positionIndexInternal from '../internal/position-index';
import { Chess, ChessOperation, ChessPositionIndex, PlayerReview } from '../types';

export default ChessOperation.RebuildPositionIndex.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ review: reviewRef }) {
      const review = yield* Database.load(reviewRef);
      invariant(
        review.playerIdentity || review.playerName,
        'Player review requires playerIdentity or playerName to match games.',
      );

      const positionIndex = yield* Database.load(review.positionIndex);
      const games = yield* Database.query(Filter.type(Game)).run;

      const processed: Array<{
        game: Game;
        side: ChessPositionIndex.Side;
        fens: readonly string[];
      }> = [];

      for (const game of games) {
        const side = positionIndexInternal.playerSideInGame(review, game);
        if (!side) {
          continue;
        }

        // Skip games whose variant is not chess, but let database/ref failures abort the rebuild
        // rather than silently producing a partial index.
        const loaded = yield* loadGame(Ref.make(game), Chess.State).pipe(
          Effect.asSome,
          Effect.catchIf(
            (error) => error instanceof GameVariantMismatchError,
            () => Effect.succeedNone,
          ),
        );
        if (Option.isNone(loaded)) {
          continue;
        }

        const { variant } = loaded.value;
        processed.push({
          game,
          side,
          fens: positionIndexInternal.positionsForSide({
            pgn: variant.pgn,
            fen: variant.fen,
            side,
          }),
        });
      }

      const nextIndex = positionIndexInternal.buildIndex(processed);
      const positionsUpdated = positionIndexInternal.applyIndexDiff(positionIndex, nextIndex);
      yield* Database.flush();

      return { gamesScanned: processed.length, positionsUpdated };
    }),
  ),
  Operation.opaqueHandler,
);
