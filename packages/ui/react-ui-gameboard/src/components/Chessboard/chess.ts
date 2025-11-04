//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, signal } from '@preact/signals-core';
import { Chess as ChessJS } from 'chess.js';
import { type FC, type SVGProps } from 'react';

import { invariant } from '@dxos/invariant';
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

export const locationToPos = ([row, col]: Location): string => String.fromCharCode(col + 'a'.charCodeAt(0)) + (row + 1);

export const getRawPgn = (pgn: string) => pgn.replace(/\[.*?\]/g, '').trim();

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

export const getSquareColor = ([row, col]: Location) => ((col + row) % 2 === 0 ? boardStyles.black : boardStyles.white);

export const createChess = (pgn?: string): ChessJS => {
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
 * Chess model.
 */
export class ChessModel implements GameboardModel<ChessPiece> {
  private readonly _chess = new ChessJS();
  private readonly _pieces = signal<PieceMap<ChessPiece>>({});
  private readonly _moveIndex = signal(0);

  constructor(pgn?: string) {
    this.update(pgn);
  }

  get readonly(): boolean {
    return this._moveIndex.value !== this._chess.history().length;
  }

  get turn(): Player {
    return this._chess.turn() === 'w' ? 'white' : 'black';
  }

  get game(): ChessJS {
    return this._chess;
  }

  get pieces(): ReadonlySignal<PieceMap<ChessPiece>> {
    return this._pieces;
  }

  get moveIndex(): ReadonlySignal<number> {
    return this._moveIndex;
  }

  get fen() {
    return this._chess.fen();
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
    return getRawPgn(this._chess.pgn());
  }

  setMoveIndex(index: number) {
    const temp = new ChessJS();
    const history = this._chess.history({ verbose: true });
    for (let i = 0; i < index && i < history.length; i++) {
      temp.move(history[i]);
    }
    this._updateBoard(temp);
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

    this._updateBoard(this._chess);
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

    this._updateBoard(this._chess);
    return true;
  }

  makeRandomMove(): boolean {
    const moves = this._chess.moves();
    if (!moves.length) {
      return false;
    }

    const move = moves[Math.floor(Math.random() * moves.length)];
    this._chess.move(move);

    this._updateBoard(this._chess);
    return true;
  }

  /**
   * Update pieces preserving identity.
   */
  private _updateBoard(chess: ChessJS): void {
    this._pieces.value = createPieceMap(chess);
    this._moveIndex.value = chess.history().length;
  }
}

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
    return null;
  }
};

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
 * Starting from a new game, assign piece IDs based on their starting position.
 * Then iterate through the history of the provided game and update the piece map.
 */
export const createPieceMap = (chess: ChessJS): PieceMap<ChessPiece> => {
  const temp = new ChessJS();
  let pieces = _createPieceMap(temp);
  const history = chess.history({ verbose: true });
  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    temp.move(move);
    pieces = _diffPieces(pieces, _createPieceMap(temp));
    const test = new Set();
    Object.values(pieces).forEach((piece) => {
      invariant(!test.has(piece.id), 'Duplicate: ' + piece.id);
      test.add(piece.id);
    });
  }

  return pieces;
};

/**
 * Create a map of pieces from the board positions; assign each piece the ID of the current square.
 */
const _createPieceMap = (chess: ChessJS): PieceMap<ChessPiece> => {
  const pieces: PieceMap<ChessPiece> = {};
  chess.board().flatMap((row) =>
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

  return pieces;
};

/**
 * Preserve the original piece objects (and IDs).
 */
const _diffPieces = <T extends PieceType>(before: PieceMap<T>, after: PieceMap<T>): PieceMap<T> => {
  const difference: { added: PieceMap; removed: PieceMap } = {
    removed: {},
    added: {},
  };

  // Removed.
  (Object.keys(before) as Array<keyof typeof before>).forEach((square) => {
    if (after[square]?.type !== before[square]?.type) {
      difference.removed[square] = before[square];
    }
  });

  // Added.
  (Object.keys(after) as Array<keyof typeof after>).forEach((square) => {
    if (before[square]?.type !== after[square]?.type) {
      difference.added[square] = after[square];
    } else {
      after[square] = before[square];
    }
  });

  // Preserve IDs.
  for (const piece of Object.values(difference.added)) {
    const previous = Object.values(difference.removed).find((p) => p.type === piece.type);
    if (previous) {
      piece.id = previous.id;
    }
  }

  return after;
};

const createDate = (date = new Date()) => date.toISOString().slice(0, 10).replace(/-/g, '.'); // e.g., "2025.08.05"
