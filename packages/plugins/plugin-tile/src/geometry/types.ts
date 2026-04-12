//
// Copyright 2026 DXOS.org
//

import { type Tile } from '#types';

export interface Coord {
  q: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridConfig {
  gridType: Tile.GridType;
  tileSize: number;
  groutWidth: number;
}
