//
// Copyright 2023 DXOS.org
//

import { DndContext, DragCancelEvent, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import React, { createContext, useContext, FC, PropsWithChildren, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { raise } from '@dxos/debug';

import { DefaultComponent } from './DefaultComponent';
import { MosaicContainerProps, MosaicDataItem, MosaicDraggedItem, MosaicTileComponent } from './types';
import { Debug } from '../components/Debug';

export type MosaicContextType = {
  delegators: Map<string, MosaicContainerProps<any>>;
  activeItem: MosaicDraggedItem | undefined;
  overItem: MosaicDraggedItem | undefined;
};

export const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

const DEFAULT_COMPONENT_ID = '__default';

export type MosaicContextProviderProps = PropsWithChildren & {
  Component?: MosaicTileComponent<any>;
  debug?: boolean;
};

/**
 * Root provider.
 */
export const MosaicContextProvider: FC<MosaicContextProviderProps> = ({
  Component = DefaultComponent,
  debug,
  children,
}) => {
  const [delegators] = useState(
    new Map<string, MosaicContainerProps<any>>([[DEFAULT_COMPONENT_ID, { id: DEFAULT_COMPONENT_ID, Component }]]),
  );
  const [activeItem, setActiveItem] = useState<MosaicDraggedItem>();
  const [overItem, setOverItem] = useState<MosaicDraggedItem>();

  const handleDragStart = (event: DragStartEvent) => {
    // console.log('start', event.active?.data.current);
    setActiveItem(event.active.data.current as MosaicDraggedItem);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // console.log('over', event.over?.data.current);
    if (event.over?.data.current) {
      setOverItem(event.over?.data.current as MosaicDraggedItem);
    }
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    // console.log('cancel');
    setActiveItem(undefined);
    setOverItem(undefined);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // console.log('end');
    if (
      activeItem &&
      overItem &&
      (activeItem.container !== overItem.container || activeItem.position !== overItem.position)
    ) {
      const activeContainer = delegators.get(activeItem.container);
      if (activeContainer) {
        activeContainer.onMoveItem?.({
          container: activeContainer.id,
          active: activeItem,
          over: overItem,
        });
        const overContainer = delegators.get(overItem.container);
        if (overContainer && overContainer !== activeContainer) {
          overContainer?.onMoveItem?.({
            container: overContainer.id,
            active: activeItem,
            over: overItem,
          });
        }
      }
    }

    setActiveItem(undefined);
    setOverItem(undefined);
  };

  const container =
    (activeItem?.container ? delegators.get(overItem?.container ?? activeItem.container) : undefined) ??
    delegators.get(DEFAULT_COMPONENT_ID)!;
  const { Component: OverlayComponent = DefaultComponent } = container;

  return (
    <MosaicContext.Provider value={{ delegators, activeItem, overItem }}>
      <DndContext
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {/* Active dragging element. */}
        {createPortal(
          <DragOverlay>
            {activeItem && (
              <div style={{ ...container.getBounds?.() }} className='ring'>
                <OverlayComponent data={activeItem.item} isActive={true} />
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}

        {children}

        {debug &&
          createPortal(
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
            />,
            document.body,
          )}
      </DndContext>
    </MosaicContext.Provider>
  );
};

/**
 * Returns a patched collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out..
 */
// TODO(burdon): Rename?
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

/**
 * Register a container?
 */
export const useMosaicContainer = (container: MosaicContainerProps<any>) => {
  const mosaic = useContext(MosaicContext) ?? raise(new Error('Missing MosaicContext'));
  useEffect(() => {
    mosaic.delegators.set(container.id, container);
    return () => {
      mosaic.delegators.delete(container.id);
    };
  }, []);
};
