//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { DeepSignal } from 'deepsignal';
import { FC } from 'react';

export type TileVariant = 'stack' | 'card';

export type Tile = {
  // Primary props
  id: string;
  index: string;
  variant: TileVariant;
  // Secondary props
  migrationClass?: string;
  acceptMigrationClass?: Set<string>;
  sortable?: boolean;
};

export type TileProps = {
  tile: Tile;
  // Computed props
  draggable?: boolean;
};

export type Mosaic = {
  tiles: Record<string, Tile>;
  relations: Record<string, Record<string, Set<string>>>;
};

export type DelegatorProps = {
  data: any;
  tileVariant: TileVariant;
  dragHandleAttributes: ReturnType<typeof useSortable>['attributes'];
  dragHandleListeners: ReturnType<typeof useSortable>['listeners'];
};

export type Handler<E> = (event: E) => void;

export type MosaicRearrangeEvent = { type: 'rearrange'; id: string; index: string };
export type MosaicMigrateEvent = { type: 'migrate'; id: string; fromId: string; toId: string; relation: string };

export type MosaicChangeEvent = MosaicRearrangeEvent | MosaicMigrateEvent;

export type MosaicChangeHandler = Handler<MosaicChangeEvent>;

export type MosaicContextValue = {
  mosaic: DeepSignal<Mosaic>;
  data: Record<string, any>;
  Delegator: FC<DelegatorProps>;
  onMosaicChange: MosaicChangeHandler;
};

export type MosaicProps = {
  root: string;
} & MosaicContextValue;
