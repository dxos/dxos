//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import React, { createContext, useContext, FC, PropsWithChildren, useState } from 'react';
import { createPortal } from 'react-dom';

import { MosaicTileComponent, MosaicMoveEvent, MosaicDataItem } from './types';

export type MosaicContextType = {
  Component: MosaicTileComponent<any>;
};

export const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

export type MosaicContextProviderProps = PropsWithChildren &
  MosaicContextType & {
    onMove: (event: MosaicMoveEvent<any, any>) => void;
  };

/**
 * Root provider.
 */
export const MosaicContextProvider: FC<MosaicContextProviderProps> = ({ Component, onMove, children }) => {
  const [activeItem, setActiveItem] = useState<MosaicDataItem<unknown, any>>();

  const handleDragStart = (event: DragEndEvent) => {
    setActiveItem(event.active.data.current as MosaicDataItem<unknown, any>);
  };

  const handleDragOver = (event: DragEndEvent) => {
    console.log(JSON.stringify(event.over));
  };

  const handleDragCancel = (event: DragEndEvent) => {
    setActiveItem(undefined);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over?.id && active.id !== over?.id) {
      onMove({
        active: active.data.current as MosaicDataItem<any, any>,
        over: over.data.current as MosaicDataItem<any, any>,
      });
    }

    setActiveItem(undefined);
  };

  return (
    <MosaicContext.Provider value={{ Component }}>
      <DndContext
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {/* Dragging element. */}
        {createPortal(
          <DragOverlay>{activeItem && <Component id={activeItem.id} data={activeItem.data} />}</DragOverlay>,
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
