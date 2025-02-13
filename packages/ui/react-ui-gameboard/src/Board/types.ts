//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal } from '@preact/signals-core';

export type Player = 'black' | 'white';

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
export type PieceMap<T extends PieceType = PieceType> = Record<string, PieceRecord<T>>;

export type Move = {
  source: Location;
  target: Location;
  piece: PieceType;
  promotion?: PieceType;
};

export const locationToString = (location: Location): string => location.join('-');
export const stringToLocation = (str: string): Location => str.split('-').map(Number) as Location;

// Type guard.
export const isPiece = (piece: unknown): piece is PieceType => typeof piece === 'string';

// Type guard.
export const isLocation = (token: unknown): token is Location =>
  Array.isArray(token) && token.length === 2 && token.every((val) => typeof val === 'number');

export const isEqualLocation = (l1: Location, l2: Location): boolean => l1[0] === l2[0] && l1[1] === l2[1];

export interface BoardModel<T extends PieceType = PieceType> {
  pieces: ReadonlySignal<PieceMap<T>>;
  isValidMove: (move: Move) => boolean;
}
