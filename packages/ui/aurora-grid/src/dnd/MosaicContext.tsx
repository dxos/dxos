//
// Copyright 2023 DXOS.org
//

import { DndContext, DragCancelEvent, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import React, { createContext, useContext, FC, PropsWithChildren, useState } from 'react';
import { createPortal } from 'react-dom';

import { MosaicTileComponent, MosaicMoveEvent, MosaicDraggedItem } from './types';

export type MosaicContextType = {
  Component: MosaicTileComponent<any>;
  activeItem: MosaicDraggedItem | undefined;
  overItem: MosaicDraggedItem | undefined;
};

export const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

export type MosaicContextProviderProps = PropsWithChildren & {
  Component: MosaicTileComponent<any>;
  onMove: (event: MosaicMoveEvent) => void;
};

/**
 * Root provider.
 */
export const MosaicContextProvider: FC<MosaicContextProviderProps> = ({ Component, onMove, children }) => {
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
    const { active, over } = event;
    if (over?.id && active.id !== over?.id) {
      onMove({
        active: active.data.current as MosaicDraggedItem,
        over: over.data.current as MosaicDraggedItem,
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
        <pre className='font-mono text-xs overflow-hidden absolute left-0 bottom-0'>
          {JSON.stringify(
            {
              active: {
                id: activeItem?.item.id,
                parent: activeItem?.parent,
              },
              over: {
                id: overItem?.item.id,
                parent: overItem?.parent,
              },
            },
            undefined,
            2,
          )}
        </pre>
        {/* Dragging element. */}
        {createPortal(
          <DragOverlay>{activeItem && <Component id={activeItem.item.id} data={activeItem.item.data} />}</DragOverlay>,
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

export const useGhost = (id: string) => {
  const { activeItem, overItem } = useContext(MosaicContext)!;
  return activeItem?.parent !== id && overItem?.parent === id ? activeItem?.item : undefined;
};
