//
// Copyright 2026 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';

import { Obj, Ref } from '@dxos/echo';
import { type Game } from '@dxos/plugin-game/types';

import * as ChessPositionIndex from '../types/ChessPositionIndex';
import * as PlayerReview from '../types/PlayerReview';

/** Normalizes a FEN to the position key (board, side, castling, en passant). */
export const normalizeFen = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

const sideToTurn = (side: ChessPositionIndex.Side): 'w' | 'b' => (side === 'white' ? 'w' : 'b');

/** Maximum full moves per game indexed (opening window). */
export const OPENING_FULL_MOVE_LIMIT = 10;

/** Half-move cap for the opening window. */
export const OPENING_PLY_LIMIT = OPENING_FULL_MOVE_LIMIT * 2;

/**
 * Positions where `side` is to move, derived from chess state PGN/FEN.
 * Only positions within the first {@link OPENING_FULL_MOVE_LIMIT} full moves are indexed.
 */
export const positionsForSide = ({
  pgn,
  fen,
  side,
}: {
  pgn?: string;
  fen?: string;
  side: ChessPositionIndex.Side;
}): string[] => {
  const probe = new ChessJS();
  const chess = new ChessJS();
  try {
    if (pgn) {
      probe.loadPgn(pgn);
    } else if (fen) {
      // A FEN-only game has no move history to replay, so index from the supplied position itself.
      probe.load(fen);
      chess.load(fen);
    }
  } catch {
    // chess.js throws on malformed PGN/FEN; a single bad record must not abort the rebuild.
    return [];
  }

  const moves = probe.history().slice(0, OPENING_PLY_LIMIT);
  const turn = sideToTurn(side);
  const fens: string[] = [];

  if (chess.turn() === turn) {
    fens.push(normalizeFen(chess.fen()));
  }

  for (const move of moves) {
    chess.move(move);
    if (chess.turn() === turn) {
      fens.push(normalizeFen(chess.fen()));
    }
  }

  return fens;
};

/** Resolves which side the reviewed player played in a game, if any. */
export const playerSideInGame = (review: PlayerReview.Review, game: Game.Game): ChessPositionIndex.Side | undefined => {
  for (const player of game.players ?? []) {
    if (review.playerIdentity && player.identity === review.playerIdentity) {
      return player.role === 'black' ? 'black' : 'white';
    }
    if (review.playerName && player.name?.trim().toLowerCase() === review.playerName.trim().toLowerCase()) {
      return player.role === 'black' ? 'black' : 'white';
    }
  }
  return undefined;
};

export type BuiltSideIndex = Record<string, Game.Game[]>;

export type BuiltIndex = Record<ChessPositionIndex.Side, BuiltSideIndex>;

/** Builds a fresh side→fen→games index from processed games. */
export const buildIndex = (
  entries: ReadonlyArray<{ game: Game.Game; side: ChessPositionIndex.Side; fens: readonly string[] }>,
): BuiltIndex => {
  const index: BuiltIndex = { white: {}, black: {} };
  for (const { game, side, fens } of entries) {
    for (const fen of fens) {
      const bucket = index[side][fen] ?? [];
      if (!bucket.some((existing) => existing.id === game.id)) {
        bucket.push(game);
      }
      index[side][fen] = bucket;
    }
  }
  return index;
};

const gameIdsKey = (games: ReadonlyArray<{ id: string }>): string =>
  games
    .map((game) => game.id)
    .toSorted()
    .join('\0');

const refsGameIdsKey = (games: ReadonlyArray<Ref.Ref<Game.Game>>): string =>
  games
    .map((gameRef) => gameRef.target?.id ?? gameRef.uri)
    .toSorted()
    .join('\0');

/**
 * Applies a rebuilt index onto an existing {@link ChessPositionIndex.PositionIndex},
 * mutating only FEN leaves whose game sets changed and removing stale FEN keys.
 */
export const applyIndexDiff = (positionIndex: ChessPositionIndex.PositionIndex, next: BuiltIndex): number => {
  let updatedLeaves = 0;

  Obj.update(positionIndex, (positionIndex) => {
    for (const side of ['white', 'black'] as const) {
      const sideIndex = positionIndex.index[side];
      const nextSide = next[side];

      for (const fen of Object.keys(sideIndex)) {
        if (!nextSide[fen]) {
          delete sideIndex[fen];
          updatedLeaves++;
        }
      }

      for (const [fen, games] of Object.entries(nextSide)) {
        const existing = sideIndex[fen];
        if (existing && refsGameIdsKey(existing.games) === gameIdsKey(games)) {
          continue;
        }

        sideIndex[fen] = { games: games.map((game) => Ref.make(game)) };
        updatedLeaves++;
      }
    }
  });

  return updatedLeaves;
};
