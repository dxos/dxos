//
// Copyright 2023 DXOS.org
//

import { DndContext, DragCancelEvent, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import pick from 'lodash.pick';
import React, { createContext, useContext, FC, PropsWithChildren, useState, Component } from 'react';
import { createPortal } from 'react-dom';

import { DensityProvider } from '@dxos/aurora';
import { raise } from '@dxos/debug';

import { DefaultComponent } from './DefaultComponent';
import { MosaicContainerProps } from './MosaicContainer';
import { MosaicDraggedItem, MosaicTileComponent } from './types';
import { Debug } from '../components';

export type MosaicContextType = {
  setContainer: (id: string, container?: MosaicContainerProps<any>) => void;
  activeItem: MosaicDraggedItem | undefined;
  overItem: MosaicDraggedItem | undefined;
};

export const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

const DEFAULT_COMPONENT_ID = '__default';

export type MosaicContextProviderProps = PropsWithChildren & {
  Component?: MosaicTileComponent<any, any>;
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
  const [containers, setContainers] = useState(
    new Map<string, MosaicContainerProps<any>>([[DEFAULT_COMPONENT_ID, { id: DEFAULT_COMPONENT_ID, Component }]]),
  );
  const handleSetContainer = (id: string, container?: MosaicContainerProps<any>) => {
    setContainers((containers) => {
      const copy = new Map(containers);
      if (container) {
        copy.set(id, container);
      } else {
        copy.delete(id);
      }
      return copy;
    });
  };

  const [activeItem, setActiveItem] = useState<MosaicDraggedItem>();
  const [overItem, setOverItem] = useState<MosaicDraggedItem>();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(pick(event.active.data.current as MosaicDraggedItem, 'container', 'item', 'position'));
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverItem(pick(event.over?.data.current as MosaicDraggedItem, 'container', 'item', 'position'));
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    setActiveItem(undefined);
    setOverItem(undefined);
  };

  // TODO(burdon): Add event type (e.g., copy vs. move).
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

  // TODO(burdon): Factor out DragOverlay.
  // Get the overlay component from the over container, otherwise default to the original.
  let container: MosaicContainerProps<any> | undefined;
  let OverlayComponent: MosaicTileComponent<any, any> | undefined;
  if (activeItem) {
    if (overItem) {
      container = containers.get(overItem.container);
      OverlayComponent = container?.isDroppable?.(activeItem) ? container.Component : undefined;
    }

    if (!OverlayComponent) {
      container = containers.get(activeItem.container);
      OverlayComponent = container?.isDroppable?.(activeItem) ? container.Component : DefaultComponent;
    }
  }

  return (
    <MosaicContext.Provider value={{ setContainer: handleSetContainer, activeItem, overItem }}>
      <DndContext
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {/* Active dragging element. */}
        {createPortal(
          <DragOverlay>
            {activeItem && container && OverlayComponent && (
              <div style={{ ...container.getOverlayStyle?.() }}>
                <OverlayErrorBoundary>
                  {/* TODO(burdon): Configure density via getOverlayProps. */}
                  <DensityProvider density='fine'>
                    <OverlayComponent
                      {...container.getOverlayProps?.()}
                      data={activeItem.item}
                      container={activeItem.container}
                      isActive={true}
                    />
                  </DensityProvider>
                </OverlayErrorBoundary>
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
                containers: Array.from(containers.keys()).map((id) => id),
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

export const useMosaic = () => useContext(MosaicContext) ?? raise(new Error('Missing MosaicContext'));

class OverlayErrorBoundary extends Component<PropsWithChildren> {
  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override state = {
    error: null,
  };

  override componentDidCatch(error: any, info: any) {
    console.warn(error, info);
  }

  // TODO(burdon): Fallback to using active item's original container.
  override render() {
    if (this.state.error) {
      return <p>ERROR: ${String(this.state.error)}</p>;
    }

    return this.props.children;
  }
}
