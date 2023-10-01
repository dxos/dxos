//
// Copyright 2023 DXOS.org
//

import { DndContext, DragCancelEvent, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import React, { createContext, useContext, FC, PropsWithChildren, useState } from 'react';
import { createPortal } from 'react-dom';

import { MosaicTileComponent, MosaicMoveEvent, MosaicDraggedItem, MosaicDataItem } from './types';
import { Debug } from '../components/Debug';

export type MosaicContextType = {
  Component: MosaicTileComponent<any>;
  activeItem: MosaicDraggedItem | undefined;
  overItem: MosaicDraggedItem | undefined;
};

export const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

export type MosaicContextProviderProps = PropsWithChildren & {
  Component: MosaicTileComponent<any>;
  onMove: (event: MosaicMoveEvent) => void;
  debug?: boolean;
};

/**
 * Root provider.
 */
export const MosaicContextProvider: FC<MosaicContextProviderProps> = ({ Component, debug, onMove, children }) => {
  const [activeItem, setActiveItem] = useState<MosaicDraggedItem>();
  const [overItem, setOverItem] = useState<MosaicDraggedItem>();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current as MosaicDraggedItem);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverItem(over?.data.current as MosaicDraggedItem);
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    setActiveItem(undefined);
    setOverItem(undefined);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (
      activeItem &&
      overItem &&
      (activeItem.container !== overItem.container || activeItem.position !== overItem.position)
    ) {
      onMove({
        active: activeItem,
        over: overItem,
      });
    }

    setActiveItem(undefined);
    setOverItem(undefined);
  };

  return (
    <MosaicContext.Provider value={{ activeItem, overItem, Component }}>
      <DndContext
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {debug && (
          <Debug
            position='bottom-left'
            data={{
              active: {
                id: activeItem?.item.id,
                container: activeItem?.container,
              },
              over: {
                id: overItem?.item?.id,
                container: overItem?.container,
              },
            }}
          />
        )}

        {/* Dragging element. */}
        {createPortal(
          <DragOverlay>
            {activeItem && <Component id={activeItem.item.id} data={activeItem.item} isActive={true} />}
          </DragOverlay>,
          document.body,
        )}

        {children}
      </DndContext>
    </MosaicContext.Provider>
  );
};

export const useMosaic = () => {
  return useContext(MosaicContext);
};

/**
 * Returns a patched collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out..
 */
// TODO(burdon): Sorted
export const useSortedItems = (id: string, items: MosaicDataItem[]): MosaicDataItem[] => {
  const { activeItem, overItem } = useContext(MosaicContext)!;
  if (activeItem && activeItem.container !== id && overItem?.container === id) {
    return [activeItem.item, ...items];
  }
  if (activeItem && activeItem.container === id && overItem?.container !== activeItem.container) {
    return items.filter((item) => item.id !== activeItem.item.id);
  }
  return items;
};
