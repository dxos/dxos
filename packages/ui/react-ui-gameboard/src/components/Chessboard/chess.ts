//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, signal } from '@preact/signals-core';
import { Chess as ChessJS } from 'chess.js';
import { type FC, type SVGProps } from 'react';

import { log } from '@dxos/log';

import * as Alpha from '../../gen/pieces/chess/alpha';
import {
  type GameboardModel,
  type Location,
  type Move,
  type PieceMap,
  type PieceType,
  type Player,
  locationToString,
} from '../Gameboard';

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

const styles = {
  neutral: {
    black: 'bg-neutral-50',
    white: 'bg-neutral-200',
    promotion: 'bg-neutral-200 hover:bg-neutral-300 opacity-70 hover:opacity-100',
  },
  original: {
    black: 'bg-[#6C95B9]',
    white: 'bg-[#CCD3DB]',
    promotion: 'duration-500 bg-[#CCD3DB] opacity-70 hover:opacity-100',
  },
  blue: {
    black: 'bg-[#608BC1]',
    white: 'bg-[#CBDCEB]',
    promotion: 'duration-500 bg-[#CBDCEB] opacity-70 hover:opacity-100',
  },
  green: {
    black: 'bg-[#8EB486]',
    white: 'bg-[#FDF7F4]',
    promotion: 'duration-500 bg-[#FDF7F4] opacity-70 hover:opacity-100',
  },
};

export const boardStyles = styles.original;

export const getSquareColor = ([row, col]: Location) => {
  return (col + row) % 2 === 0 ? boardStyles.black : boardStyles.white;
};

export const createChess = (pgn?: string) => {
  const chess = new ChessJS();
  if (pgn) {
    try {
      chess.loadPgn(pgn);
    } catch {
      log.warn(pgn);
    }
  }

  return chess;
};

/**
 * Attempt move.
 */
const tryMove = (chess: ChessJS, move: Move): ChessJS | null => {
  const from = locationToPos(move.from);
  const to = locationToPos(move.to);
  try {
    const promotion = move.promotion ? move.promotion[1].toLowerCase() : 'q';
    chess.move({ from, to, promotion }, { strict: false });
    return chess;
  } catch {
    // Ignore.
    return null;
  }
};

/**
 * Chess model.
 */
export class ChessModel implements GameboardModel<ChessPiece> {
  private readonly _chess = new ChessJS();
  private readonly _pieces = signal<PieceMap<ChessPiece>>({});

  constructor(pgn?: string) {
    this.update(pgn);
  }

  get turn(): Player {
    return this._chess.turn() === 'w' ? 'white' : 'black';
  }

  get pieces(): ReadonlySignal<PieceMap<ChessPiece>> {
    return this._pieces;
  }

  get game(): ChessJS {
    return this._chess;
  }

  /**
   * PGN with headers.
   *
   * [Event "?"]
   * [Site "?"]
   * [Date "2025.08.05"]
   * [Round "?"]
   * [White "?"]
   * [Black "?"]
   * [Result "*"]
   */
  // TODO(burdon): Update headers.
  get pgn(): string {
    return this._chess.pgn();
  }

  get fen(): string {
    return this._chess.fen();
  }

  update(pgn = ''): void {
    const previous = this._chess.history();
    try {
      this._chess.loadPgn(pgn);
      // TODO(burdon): Get from TS.
      // TODO(burdon): Update if not set.
      this._chess.setHeader('Date', createDate());
      this._chess.setHeader('Site', 'dxos.org');
      // TODO(burdon): Update player keys.
      // this._chess.setHeader('White', 'White');
      // this._chess.setHeader('Black', 'Black');
    } catch {
      // Ignore.
    }

    const current = this._chess.history();
    if (!isValidNextMove(previous, current)) {
      this._pieces.value = {};
    }

    this._update();
  }

  isValidMove(move: Move): boolean {
    return tryMove(new ChessJS(this._chess.fen()), move) !== null;
  }

  canPromote(move: Move): boolean {
    const isPawnMove = move.piece === 'BP' || move.piece === 'WP';
    const isToLastRank = move.to[0] === 0 || move.to[0] === 7;
    return isPawnMove && isToLastRank;
  }

  makeMove(move: Move): boolean {
    const game = tryMove(this._chess, move);
    if (!game) {
      return false;
    }

    this._update();
    return true;
  }

  makeRandomMove(): boolean {
    const moves = this._chess.moves();
    if (!moves.length) {
      return false;
    }

    const move = moves[Math.floor(Math.random() * moves.length)];
    this._chess.move(move);
    this._update();
    return true;
  }

  /**
   * Update pieces preserving identity.
   */
  private _update(): void {
    const pieces: PieceMap<ChessPiece> = {};
    this._chess.board().flatMap((row) =>
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
          side: color === 'w' ? 'white' : 'black',
          location,
        };
      }),
    );

    this._pieces.value = mapPieces(this._pieces.value, pieces);
  }
}

const isValidNextMove = (previous: string[], current: string[]) => {
  if (current.length > previous.length + 1) {
    return false;
  }

  for (let i = 0; i < previous.length; i++) {
    if (previous[i] !== current[i]) {
      return false;
    }
  }

  return true;
};

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

const createDate = (date = new Date()) => date.toISOString().slice(0, 10).replace(/-/g, '.'); // e.g., "2025.08.05"
