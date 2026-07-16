//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { Game } from '@dxos/plugin-game/types';

import * as positionIndexInternal from '../internal/position-index';
import { Chess, ChessOperation, ChessPositionIndex, PlayerReview } from '../types';
import { ChessOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: ChessOperationHandlerSet,
  types: [Chess.State, Game.Game, PlayerReview.Review, ChessPositionIndex.PositionIndex],
  disableLlmMemoization: true,
});

describe('position-index', () => {
  test('normalizes FEN to the first four fields', () => {
    expect(positionIndexInternal.normalizeFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3',
    );
  });

  test('collects white-to-move positions from PGN', () => {
    const fens = positionIndexInternal.positionsForSide({
      pgn: '1. e4 e5 2. Nf3',
      side: 'white',
    });
    expect(fens.length).toBeGreaterThan(1);
    expect(fens[0]).toBe(
      positionIndexInternal.normalizeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
    );
  });

  test('indexes only the first 10 full moves', () => {
    const tenMoves =
      '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 *';
    const longer = `${tenMoves.slice(0, -2)} 11. d4 cxd4 12. cxd4 *`;

    const limited = positionIndexInternal.positionsForSide({ pgn: longer, side: 'white' });
    const baseline = positionIndexInternal.positionsForSide({ pgn: tenMoves, side: 'white' });

    expect(limited).toEqual(baseline);
  });
});

describe('RebuildPositionIndex', () => {
  it.effect(
    'indexes games for the reviewed player',
    Effect.fnUntraced(
      function* ({ expect }) {
        const review = yield* Database.add(PlayerReview.makeReview({ playerName: 'alice' }));
        const variant = Chess.make({ pgn: '1. e4 e5 2. Nf3 Nc6 *' });
        const game = Game.make({
          name: 'alice vs bob',
          players: [
            { role: 'white', name: 'alice' },
            { role: 'black', name: 'bob' },
          ],
          variant,
        });
        yield* Database.add(variant);
        yield* Database.add(game);
        yield* Database.flush();

        const result = yield* Operation.invoke(ChessOperation.RebuildPositionIndex, { review: Ref.make(review) });
        expect(result.gamesScanned).toBe(1);
        expect(result.positionsUpdated).toBeGreaterThan(0);

        const index = yield* Database.load(review.positionIndex);
        const whiteKeys = Object.keys(index.index.white);
        expect(whiteKeys.length).toBeGreaterThan(0);
        const startKey = positionIndexInternal.normalizeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        expect(index.index.white[startKey]?.games).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'updates only changed FEN leaves on rebuild',
    Effect.fnUntraced(
      function* ({ expect }) {
        const review = yield* Database.add(PlayerReview.makeReview({ playerName: 'alice' }));
        const variant = Chess.make({ pgn: '1. e4 e5 *' });
        const game = Game.make({
          players: [
            { role: 'white', name: 'alice' },
            { role: 'black', name: 'bob' },
          ],
          variant,
        });
        yield* Database.add(variant);
        yield* Database.add(game);
        yield* Database.flush();

        const first = yield* Operation.invoke(ChessOperation.RebuildPositionIndex, { review: Ref.make(review) });
        const second = yield* Operation.invoke(ChessOperation.RebuildPositionIndex, { review: Ref.make(review) });
        expect(first.positionsUpdated).toBeGreaterThan(0);
        expect(second.positionsUpdated).toBe(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
