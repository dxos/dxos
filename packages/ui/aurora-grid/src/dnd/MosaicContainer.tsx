//
// Copyright 2023 DXOS.org
//

import React, {
  createContext,
  useContext,
  FC,
  PropsWithChildren,
  useEffect,
  HTMLAttributes,
  CSSProperties,
} from 'react';

import { raise } from '@dxos/debug';

import { useMosaic } from './MosaicContext';
import {
  MosaicDataItem,
  MosaicDraggedItem,
  MosaicMoveEvent,
  MosaicTileComponent,
  MosaicTileOverlayProps,
} from './types';

export type MosaicContainerProps<TData extends MosaicDataItem, TPosition = unknown, TCustom = any> = Pick<
  HTMLAttributes<HTMLDivElement>,
  'className'
> & {
  id: string;
  isDroppable?: (item: MosaicDraggedItem) => boolean;
  debug?: boolean;

  // Default component used to render tiles.
  Component?: MosaicTileComponent<TData, TPosition>;

  // Overrides for the default overlay.
  getOverlayStyle?: () => CSSProperties;
  getOverlayProps?: () => MosaicTileOverlayProps;

  // TODO(burdon): Handle copy, delete, etc.
  onMoveItem?: (event: MosaicMoveEvent<TPosition>) => void;

  // Custom properties.
  custom?: TCustom;
};

type MosaicContainerContextType = MosaicContainerProps<any>;

const MosaicContainerContext = createContext<MosaicContainerContextType | undefined>(undefined);

// TODO(burdon): Combine with SortableContext?
//
//  <MosaicContainer>
//    useSortedItems()
//    <SortableContext>
//      useSortable()

/**
 * Container for a collection of tiles.
 */
// TODO(burdon): Create hierarchical ids.
// TODO(burdon): Either rename MosaicContainerProps to MosaicContainer or pass as the props (not `container`).
// TODO(burdon): Support passing in more context to event handlers; and for tiles to access.
export const MosaicContainer: FC<PropsWithChildren<{ container: MosaicContainerProps<any, any> }>> = ({
  children,
  container,
}) => {
  const mosaic = useMosaic();
  useEffect(() => {
    mosaic.setContainer(container.id, container);
    return () => {
      // TODO(burdon): The overlay unregisters the container after the tile has re-rendered (removing it).
      // mosaic.setContainer(container.id);
    };
  }, []);

  return <MosaicContainerContext.Provider value={container}>{children}</MosaicContainerContext.Provider>;
};

export const useContainer = () =>
  useContext(MosaicContainerContext) ?? raise(new Error('Missing MosaicContainerContext'));

/**
 * Returns a patched collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out..
 */
export const useSortedItems = <T extends MosaicDataItem>({
  container,
  items,
  isDroppable,
}: {
  container: string;
  items: T[];
  isDroppable?: (activeItem: MosaicDraggedItem) => boolean;
}): T[] => {
  const { activeItem, overItem } = useMosaic();
  if (
    activeItem &&
    activeItem.item.id !== container &&
    activeItem.container !== container &&
    overItem?.container === container &&
    (!isDroppable || isDroppable(activeItem))
  ) {
    // TODO(burdon): Can we check the type? Default action for `allows`?
    return [activeItem.item as T, ...items];
  }

  if (activeItem && activeItem.container === container && overItem && overItem?.container !== activeItem.container) {
    return items.filter((item) => item.id !== activeItem.item.id);
  }

  return items;
};
