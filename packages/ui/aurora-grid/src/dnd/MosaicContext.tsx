//
// Copyright 2023 DXOS.org
//

import { DndContext, DragCancelEvent, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import React, { createContext, useContext, FC, PropsWithChildren, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { DensityProvider } from '@dxos/aurora';
import { raise } from '@dxos/debug';

import { DefaultComponent } from './DefaultComponent';
import { MosaicContainerProps, MosaicDataItem, MosaicDraggedItem, MosaicTileComponent } from './types';
import { Debug } from '../components/Debug';

export type MosaicContextType = {
  containers: Map<string, MosaicContainerProps<any, any>>;
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
  const [containers] = useState(
    new Map<string, MosaicContainerProps<any>>([[DEFAULT_COMPONENT_ID, { id: DEFAULT_COMPONENT_ID, Component }]]),
  );
  const [activeItem, setActiveItem] = useState<MosaicDraggedItem>();
  const [overItem, setOverItem] = useState<MosaicDraggedItem>();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current as MosaicDraggedItem);
    console.log(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverItem(event.over?.data.current as MosaicDraggedItem);
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    setActiveItem(undefined);
    setOverItem(undefined);
  };

  // TODO(burdon): Handle copy vs. move.
  const handleDragEnd = (event: DragEndEvent) => {
    if (
      activeItem &&
      overItem &&
      (activeItem.container !== overItem.container || activeItem.position !== overItem.position)
    ) {
      const activeContainer = containers.get(activeItem.container);
      if (activeContainer) {
        activeContainer.onMoveItem?.({
          container: activeContainer.id,
          active: activeItem,
          over: overItem,
        });

        const overContainer = containers.get(overItem.container);
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
    (activeItem?.container ? containers.get(overItem?.container ?? activeItem.container) : undefined) ??
    containers.get(DEFAULT_COMPONENT_ID)!;
  const { Component: OverlayComponent = DefaultComponent } = container;

  return (
    <MosaicContext.Provider value={{ containers, activeItem, overItem }}>
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
              <div style={{ ...container.getOverlayStyle?.() }}>
                {/* TODO(burdon): Configure. */}
                <DensityProvider density='fine'>
                  <OverlayComponent data={activeItem.item} container={activeItem.container} isActive={true} />
                </DensityProvider>
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}

        {children}

        {debug &&
          createPortal(
            <Debug
              position='bottom-right'
              data={{
                active: {
                  id: activeItem?.item?.id,
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

const useMosaic = () => useContext(MosaicContext) ?? raise(new Error('Missing MosaicContext'));

/**
 * Returns a patched collection of items including a placeholder if items that could drop,
 * and removing any item that is currently being dragged out..
 */
export const useSortedItems = (id: string, items: MosaicDataItem[]): MosaicDataItem[] => {
  const { activeItem, overItem } = useMosaic();
  if (activeItem && activeItem.container !== id && overItem?.container === id) {
    return [activeItem.item, ...items];
  }
  if (activeItem && activeItem.container === id && overItem?.container !== activeItem.container) {
    return items.filter((item) => item.id !== activeItem.item.id);
  }
  return items;
};

type MosaicContainerContextType<TData extends MosaicDataItem, TPosition = unknown> = Required<
  Pick<MosaicContainerProps<TData, TPosition>, 'id' | 'Component'>
> &
  Omit<MosaicContainerProps<TData, TPosition>, 'id' | 'Component'>;

const MosaicContainerContext = createContext<MosaicContainerContextType<any, any>>({
  id: 'never',
  Component: DefaultComponent,
  onMoveItem: () => {},
});

export const useContainer = () => useContext(MosaicContainerContext);

// TODO(burdon): Support passing in more context to event handlers.
export const MosaicContainerProvider: FC<PropsWithChildren<{ container: MosaicContainerContextType<any, any> }>> = ({
  children,
  container,
}) => {
  const mosaic = useMosaic();
  useEffect(() => {
    mosaic.containers.set(container.id, container);
    return () => {
      mosaic.containers.delete(container.id);
    };
  }, []);

  return <MosaicContainerContext.Provider value={container}>{children}</MosaicContainerContext.Provider>;
};
