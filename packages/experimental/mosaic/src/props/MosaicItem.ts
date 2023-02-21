//
// Copyright 2023 DXOS.org
//

import { Vec2 } from './2d';

/**
 * Tile data item.
 */
export type MosaicItem<T extends {} = {}> = {
  id: string;
  data?: T;
  label: string;
  content?: string;
  position?: Vec2;
};
