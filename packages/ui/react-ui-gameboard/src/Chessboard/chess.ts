//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, signal } from '@preact/signals-core';
import { Chess, validateFen } from 'chess.js';
import { type FC, type SVGProps } from 'react';

import { log } from '@dxos/log';

import { type Move, type Location, type PieceMap, locationToString, type PieceType, type BoardModel } from '../Board';
import * as Alpha from '../gen/pieces/chess/alpha';

export type ChessPiece = 'BK' | 'BQ' | 'BR' | 'BB' | 'BN' | 'BP' | 'WK' | 'WQ' | 'WR' | 'WB' | 'WN' | 'WP';

export const ChessPieces: Record<ChessPiece, FC<SVGProps<SVGSVGElement>>> = Alpha;

export const posToLocation = (pos: string): Location => {
  const col = pos.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = parseInt(pos[1]) - 1;
  return [row, col];
};

export const locationToPos = ([row, col]: Location): string => {
  return String.fromCharCode(col + 'a'.charCodeAt(0)) + (row + 1);
};

export const styles = {
  neutral: {
    white: 'bg-neutral-200',
    black: 'bg-neutral-50',
  },
  blue: {
    white: 'bg-[#ccd3db]',
    black: 'bg-[#6c95b9]',
  },
};

export const getSquareColor = ([row, col]: Location) => {
  return (col + row) % 2 === 0 ? styles.blue.white : styles.blue.black;
};

/**
 * Attempt move.
 */
const makeMove = (game: Chess, { source, target }: Move): Chess | null => {
  const s = locationToPos(source);
  const t = locationToPos(target);
  try {
    log('makeMove', { s, t });
    game.move({ from: s, to: t }, { strict: false });
    return game;
  } catch (err) {
    log.error('invalid move', { err });
    return null;
  }
};

/**
 * Chess model.
 */
export class ChessModel implements BoardModel<ChessPiece> {
  private _game!: Chess;
  private readonly _pieces = signal<PieceMap<ChessPiece>>({});

  constructor(fen?: string) {
    this.initialize(fen);
  }

  get game() {
    return this._game;
  }

  get fen() {
    return this._game.fen();
  }

  get pieces(): ReadonlySignal<PieceMap<ChessPiece>> {
    return this._pieces;
  }

  initialize(fen?: string) {
    this._pieces.value = {};
    this._game = new Chess(fen ? (validateFen(fen).ok ? fen : undefined) : undefined);
    this._update();
  }

  isValidMove(move: Move): boolean {
    return makeMove(new Chess(this._game.fen()), move) !== null;
  }

  makeMove(move: Move): boolean {
    const game = makeMove(this._game, move);
    if (!game) {
      return false;
    }

    this._game = game;
    this._update();
    return true;
  }

  makeRandomMove(): boolean {
    const moves = this._game.moves();
    if (!moves.length) {
      return false;
    }

    const move = moves[Math.floor(Math.random() * moves.length)];
    this._game.move(move);
    this._update();
    return true;
  }

  /**
   * Update pieces preserving identity.
   */
  private _update() {
    const pieces: PieceMap<ChessPiece> = {};
    this._game.board().flatMap((row) =>
      row.forEach((record) => {
        if (!record) {
          return;
        }

        const { square, type, color } = record;
        const pieceType = `${color.toUpperCase()}${type.toUpperCase()}` as ChessPiece;
        const location = posToLocation(square);
        pieces[locationToString(location)] = {
          id: `${square}-${pieceType}`,
          type: pieceType,
          location,
        };
      }),
    );

    this._pieces.value = mapPieces(this._pieces.value, pieces);
  }
}

/**
 * Preserve the original piece objects (and IDs).
 */
export const mapPieces = <T extends PieceType>(before: PieceMap<T>, after: PieceMap<T>): PieceMap<T> => {
  const difference: { added: PieceMap; removed: PieceMap } = {
    removed: {},
    added: {},
  };

  (Object.keys(before) as Array<keyof typeof before>).forEach((square) => {
    if (after[square]?.type !== before[square]?.type) {
      difference.removed[square] = before[square];
    }
  });

  (Object.keys(after) as Array<keyof typeof after>).forEach((square) => {
    if (before[square]?.type !== after[square]?.type) {
      difference.added[square] = after[square];
    } else {
      after[square] = before[square];
    }
  });

  for (const piece of Object.values(difference.added)) {
    const previous = Object.values(difference.removed).find((p) => p.type === piece.type);
    if (previous) {
      piece.id = previous.id;
    }
  }

  log('delta', {
    before: Object.keys(before).length,
    after: Object.keys(after).length,
    removed: Object.keys(difference.removed).length,
    added: Object.keys(difference.added).length,
  });

  return after;
};
