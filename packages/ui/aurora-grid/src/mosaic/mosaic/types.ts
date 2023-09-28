//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { DeepSignal } from 'deepsignal';
import { ComponentPropsWithoutRef, FC, PropsWithChildren, RefAttributes } from 'react';

import { EventHandler } from '../dnd';
import { TileProps } from '../mosaic';

export type DelegatorProps<TData = any, TTile extends TileProps = TileProps> = PropsWithChildren<{
  data: TData;
  tile: TTile;
  dragHandleAttributes?: ReturnType<typeof useSortable>['attributes'];
  dragHandleListeners?: ReturnType<typeof useSortable>['listeners'];
  style?: ComponentPropsWithoutRef<'div'>['style'];
  isActive?: boolean;
  isMigrationDestination?: boolean;
  isCopyDestination?: boolean;
  isOverlay?: boolean;
  isEmpty?: boolean;
  isPreview?: boolean;
}>;

export type Delegator = FC<DelegatorProps & RefAttributes<HTMLElement>>;

export type MosaicRearrangeEvent = { type: 'rearrange'; id: string; index: string };
export type MosaicMigrateEvent = { type: 'migrate'; id: string; fromId: string; toId: string; index?: string };
export type MosaicCopyEvent = { type: 'copy'; id: string; toId: string; index?: string };
export type MosaicChangeEvent = MosaicRearrangeEvent | MosaicMigrateEvent | MosaicCopyEvent;

export type MosaicState = {
  tiles: Record<string, TileProps>;
  relations: Record<string, Record<string, Set<string>>>;
};

export type MosaicChangeHandler = EventHandler<MosaicChangeEvent>;

export type CopyTileAction = (id: string, toId: string, mosaic: MosaicState) => TileProps;

export type MosaicContextValue = {
  getData: (dndId: string) => any;
  mosaic: DeepSignal<MosaicState>;
  onMosaicChange?: MosaicChangeHandler;
  copyTile: CopyTileAction;
  Delegator: Delegator;
};

export type MosaicRootContextValue = {
  id: string;
};

export type MosaicRootProps = Omit<MosaicRootContextValue, 'id'> & Partial<Pick<MosaicRootContextValue, 'id'>>;
