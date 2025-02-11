//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';
import { type FC, type SVGProps } from 'react';

import { isNotFalsy } from '@dxos/util';

import { type PieceRecord, type Coord } from './Board';
import { BB, BK, BQ, BN, BP, BR, WB, WK, WN, WP, WQ, WR } from './gen/pieces/chess/alpha';

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

export const posToLocation = (pos: string): Coord => {
  const col = pos.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = parseInt(pos[1]) - 1;
  return [row, col];
};

export const locationToPos = ([row, col]: Coord): string => {
  return String.fromCharCode(col + 'a'.charCodeAt(0)) + (row + 1);
};

export const getPieces = (fen?: string): PieceRecord<ChessPiece>[] =>
  new Chess(fen).board().flatMap((row) =>
    row
      .map((location) => {
        if (!location) {
          return null;
        }
        const { square, type, color } = location;
        return { type: `${color.toUpperCase()}${type.toUpperCase()}` as ChessPiece, location: posToLocation(square) };
      })
      .filter(isNotFalsy),
  );
