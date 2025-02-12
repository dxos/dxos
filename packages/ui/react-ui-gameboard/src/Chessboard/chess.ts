//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';
import { type FC, type SVGProps } from 'react';

import { log } from '@dxos/log';

import { type Move, type Location, type PieceMap, locationToString } from '../Board';
import { BB, BK, BQ, BN, BP, BR, WB, WK, WN, WP, WQ, WR } from '../gen/pieces/chess/alpha';

export type ChessPiece = 'BK' | 'BQ' | 'BR' | 'BB' | 'BN' | 'BP' | 'WK' | 'WQ' | 'WR' | 'WB' | 'WN' | 'WP';

export const ChessPieces: Record<ChessPiece, FC<SVGProps<SVGSVGElement>>> = {
  BK,
  BQ,
  BR,
  BB,
  BN,
  BP,
  WK,
  WQ,
  WR,
  WB,
  WN,
  WP,
};

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
    white: 'bg-neutral-200',
    black: 'bg-neutral-50',
  },
  blue: {
    white: 'bg-[#ccd3db]',
    black: 'bg-[#6c95b9]',
  },
};

export const getSquareColor = ([row, col]: Location) => {
  return (col * 7 + row) % 2 === 0 ? styles.blue.white : styles.blue.black;
};

/**
 * Attempt move.
 */
export const makeMove = (game: Chess, { source, target }: Move): Chess | null => {
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

export const getPieces = (game: Chess): PieceMap<ChessPiece> => {
  const map: PieceMap<ChessPiece> = {};

  new Chess(game.fen()).board().flatMap((row) =>
    row.forEach((record) => {
      if (!record) {
        return;
      }

      const { square, type, color } = record;
      const pieceType = `${color.toUpperCase()}${type.toUpperCase()}` as ChessPiece;
      const location = posToLocation(square);
      map[locationToString(location)] = {
        id: `${square}-${pieceType}`,
        type: pieceType,
        location,
      };
    }),
  );

  return map;
};

/**
 * Preserve the original piece objects (and IDs).
 */
export const mapPieces = (before: PieceMap, after: PieceMap): PieceMap => {
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
      // Preserve the original piece ID.
      piece.id = previous.id;
    }
  }

  log.info('delta', {
    before: Object.keys(before).length,
    after: Object.keys(after).length,
    removed: Object.keys(difference.removed).length,
    added: Object.keys(difference.added).length,
  });

  return after;
};
