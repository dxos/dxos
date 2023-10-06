//
// Copyright 2023 DXOS.org
//

import {
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  Modifier,
  MouseSensor,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import pick from 'lodash.pick';
import React, { createContext, useContext, FC, PropsWithChildren, useState, Component, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { DensityProvider } from '@dxos/aurora';
import { raise } from '@dxos/debug';

import { DefaultComponent } from './DefaultComponent';
import { MosaicContainerProps } from './MosaicContainer';
import { Path } from './path';
import { MosaicDraggedItem, MosaicTileComponent } from './types';
import { Debug } from '../components';

export type MosaicContextType = {
  setContainer: (id: string, container?: MosaicContainerProps<any>) => void;
  activeItem: MosaicDraggedItem | undefined;
  overItem: MosaicDraggedItem | undefined;
};

export const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

const DEFAULT_COMPONENT_ID = '__default';

type MosaicContextProviderOptions = {
  overlayDelay?: number;
  debug?: boolean;
};

type MosaicContextProviderProps = PropsWithChildren &
  MosaicContextProviderOptions & {
    Component?: MosaicTileComponent<any>;
  };

/**
 * Root provider.
 */
export const MosaicContextProvider: FC<MosaicContextProviderProps> = ({
  Component = DefaultComponent,
  children,
  ...options
}) => {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  //
  // Events
  //

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(pick(event.active.data.current as MosaicDraggedItem, 'container', 'item', 'position'));
  };

  const handleDragMove = (event: DragMoveEvent) => {};

  const handleDragOver = (event: DragOverEvent) => {
    const overItem = pick(event.over?.data.current as MosaicDraggedItem, 'container', 'item', 'position');

    // If the over item is the same as the active item, do nothing.
    // This happens when moving between containers where a placeholder of itself is rendered where it will be dropped.
    if (overItem?.item?.id === activeItem?.item.id) {
      return;
    }

    const activeContainer = activeItem && containers.get(Path.first(activeItem.container));
    const overContainer = overItem?.container && containers.get(Path.first(overItem.container));
    if (!event.over || !overItem || !overContainer || !activeItem || !activeContainer) {
      setOverItem(undefined);
      return;
    }

    const isDroppable = overContainer.isDroppable ?? (() => true);
    const item = isDroppable({ container: overItem.container, active: activeItem, over: overItem })
      ? overItem
      : undefined;
    setOverItem(item);
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
      // TODO(wittjosiah): This is a hack to get the container id, if this is a pattern make it a utility function.
      const activeContainer = containers.get(Path.first(activeItem.container));
      if (activeContainer) {
        activeContainer.onDrop?.({
          container: activeContainer.id,
          active: activeItem,
          over: overItem,
        });

        const overContainer = containers.get(Path.first(overItem?.container));
        if (overContainer && overContainer !== activeContainer) {
          overContainer.onDrop?.({
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
  let OverlayComponent: MosaicTileComponent<any> | undefined;
  if (activeItem) {
    if (overItem) {
      container = containers.get(Path.first(overItem.container));
      OverlayComponent = container?.Component;
    }

    if (!OverlayComponent) {
      container = containers.get(Path.first(activeItem.container));
      OverlayComponent = container?.Component ?? DefaultComponent;
    }
  }

  const containerContextModifier: Modifier = (props) => {
    const { transform } = props;
    if (activeItem) {
      const container = containers.get(activeItem.container);
      return container?.modifier?.(activeItem, props) ?? transform;
    } else {
      return transform;
    }
  };

  return (
    <MosaicContext.Provider value={{ setContainer: handleSetContainer, activeItem, overItem }}>
      <DndContext
        collisionDetection={rectIntersection}
        modifiers={[containerContextModifier]}
        sensors={sensors}
        // TODO(burdon): Allow container to veto drop.
        cancelDrop={(event) => false}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {createPortal(
          <DragOverlay>
            <MosaicDragOverlay containers={containers} activeItem={activeItem} overItem={overItem} options={options} />
          </DragOverlay>,
          document.body,
        )}

        {children}

        {options.debug &&
          createPortal(
            <MosaicDebug containers={containers} activeItem={activeItem} overItem={overItem} />,
            document.body,
          )}
      </DndContext>
    </MosaicContext.Provider>
  );
};

export const useMosaic = () => useContext(MosaicContext) ?? raise(new Error('Missing MosaicContext'));

const MosaicDebug: FC<{
  containers: Map<string, MosaicContainerProps<any>>;
  activeItem?: MosaicDraggedItem;
  overItem?: MosaicDraggedItem;
}> = ({ containers, activeItem, overItem }) => {
  return (
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
    />
  );
};

const MosaicDragOverlay: FC<{
  containers: Map<string, MosaicContainerProps<any>>;
  activeItem?: MosaicDraggedItem;
  overItem?: MosaicDraggedItem;
  options: MosaicContextProviderOptions;
}> = ({ containers, activeItem, overItem, options: { debug, overlayDelay = 200 } }) => {
  // Get the overlay component from the over container, otherwise default to the original.
  const [{ container, OverlayComponent }, setContainer] = useState<{
    container?: MosaicContainerProps<any> | undefined;
    OverlayComponent?: MosaicTileComponent<any> | undefined;
  }>({});

  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (activeItem) {
      let container: MosaicContainerProps<any> | undefined;
      let OverlayComponent: MosaicTileComponent<any> | undefined;
      if (overItem?.container) {
        container = containers.get(Path.first(overItem.container));
        OverlayComponent = container?.Component;
      }

      if (!OverlayComponent) {
        container = containers.get(Path.first(activeItem.container));
        OverlayComponent = container?.Component ?? DefaultComponent;
      }

      // Prevent jitter when transitioning across containers.
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setContainer({ container, OverlayComponent }), timer.current ? overlayDelay : 0);
    }
  }, [activeItem, overItem]);
  if (!activeItem?.container || !container || !OverlayComponent) {
    return null;
  }

  return (
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
          {debug && (
            <div className='flex mt-1 p-1 bg-neutral-50 text-xs border rounded overflow-hidden gap-1'>
              <span className='truncate'>
                <span className='text-neutral-400'>container </span>
                {container.id}
              </span>
              <span className='truncate'>
                <span className='text-neutral-400'>item </span>
                {activeItem.item.id.slice(0, 8)}
              </span>
            </div>
          )}
        </DensityProvider>
      </OverlayErrorBoundary>
    </div>
  );
};

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
