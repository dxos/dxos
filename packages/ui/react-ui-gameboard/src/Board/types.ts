//
// Copyright 2025 DXOS.org
//

export type Location = [number, number];

export type PieceType = string;

export type PieceRecord<T extends PieceType = PieceType> = {
  location: Location;
  type: T;
};

export const isPiece = (piece: unknown): piece is PieceType => typeof piece === 'string';

export const isLocation = (token: unknown): token is Location =>
  Array.isArray(token) && token.length === 2 && token.every((val) => typeof val === 'number');

export const isEqualLocation = (c1: Location, c2: Location): boolean => c1[0] === c2[0] && c1[1] === c2[1];

export const canMove = (start: Location, destination: Location, pieceType: PieceType, pieces: PieceRecord[]) => {
  const rowDist = Math.abs(start[0] - destination[0]);
  const colDist = Math.abs(start[1] - destination[1]);

  if (pieces.find((piece) => isEqualLocation(piece.location, destination))) {
    return false;
  }

  switch (pieceType) {
    case 'king':
      return [0, 1].includes(rowDist) && [0, 1].includes(colDist);
    case 'pawn':
      return colDist === 0 && start[0] - destination[0] === -1;
    default:
      return false;
  }
};
