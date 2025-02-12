//
// Copyright 2025 DXOS.org
//

export type Side = 'black' | 'white';

export type Location = [number, number];

export type PieceType = string;

export type PieceRecord<T extends PieceType = PieceType> = {
  id: string;
  type: T;
  location: Location;
};

/**
 * Map of pieces by location.
 */
export type PieceRecordMap<T extends PieceType = PieceType> = Record<string, PieceRecord<T>>;

export type Move = {
  source: Location;
  target: Location;
  piece: PieceType;
  promotion?: PieceType;
};

export const locationToString = (location: Location): string => location.join(',');
export const stringToLocation = (str: string): Location => str.split(',').map(Number) as Location;

export const isPiece = (piece: unknown): piece is PieceType => typeof piece === 'string';

export const isLocation = (token: unknown): token is Location =>
  Array.isArray(token) && token.length === 2 && token.every((val) => typeof val === 'number');

export const isEqualLocation = (l1: Location, l2: Location): boolean => l1[0] === l2[0] && l1[1] === l2[1];

// TODO(burdon): Get game state from context (generalize).
export const isValidMove = (source: Location, target: Location, pieceType: PieceType) => {
  return true;
};
