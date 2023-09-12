//
// Copyright 2023 DXOS.org
//

export type TileVariant = 'stack' | 'card';

export type Tile = {
  // Primary props
  id: string;
  label: string;
  index: string;
  variant: TileVariant;
  // Secondary props
  class?: string;
  description?: string;
  sortable?: boolean;
  accept?: Set<string>;
};

export type TileProps = {
  tile: Tile;
};

export type Mosaic = {
  items: Record<string, Tile>;
  relations: Record<string, Record<string, Set<string>>>;
};

export type MosaicProps = {
  mosaic: Mosaic;
  root: string;
};
