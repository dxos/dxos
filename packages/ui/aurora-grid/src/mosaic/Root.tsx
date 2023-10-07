//
// Copyright 2023 DXOS.org
//

import {
  CollisionDetection,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  Modifier,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import pick from 'lodash.pick';
import React, { createContext, FC, PropsWithChildren, useState } from 'react';
import { createPortal } from 'react-dom';

import { MosaicContainerProps } from './Container';
import { Debug } from './Debug';
import { DefaultComponent } from './DefaultComponent';
import { MosaicTileComponent } from './Tile';
import { MosaicDraggedItem } from './types';
import { Path } from './util';

const DEFAULT_COMPONENT_ID = '__default';

export type MosaicContextType = {
  containers: Map<string, MosaicContainerProps<any>>;
  setContainer: (id: string, container?: MosaicContainerProps<any>) => void;
  activeItem: MosaicDraggedItem | undefined;
  overItem: MosaicDraggedItem | undefined;
};

export const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

export type MosaicRootProps = PropsWithChildren<{
  /**
   * Default component.
   */
  Component?: MosaicTileComponent<any>;
  debug?: boolean;
}>;

/**
 * Root context provider.
 */
export const MosaicRoot: FC<MosaicRootProps> = ({ Component = DefaultComponent, debug, children }) => {
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
  // DndKit Defaults
  //

  /**
   * See: https://docs.dndkit.com/api-documentation/context-provider/collision-detection-algorithms#custom-collision-detection-algorithms
   * See: https://github.com/clauderic/dnd-kit/tree/master/packages/core/src/utilities/algorithms
   */
  // TODO(burdon): Flickering: should not change while animation is happening.
  const collisionDetection: CollisionDetection = (args) => {
    // pointerWithin is the most accurate (since we're using drag handles), but only works with pointer sensors.
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // If there are no collisions with the pointer, return rectangle intersections.
    return rectIntersection(args);
  };

  /**
   * Dragging transformation modifiers adaptable by container.
   * See: https://github.com/clauderic/dnd-kit/tree/master/packages/core/src/modifiers
   */
  const modifiers: Modifier = (props) => {
    const { transform } = props;
    if (activeItem) {
      const container = containers.get(activeItem.container);
      return container?.modifier?.(activeItem, props) ?? transform;
    } else {
      return transform;
    }
  };

  /**
   * See: https://github.com/clauderic/dnd-kit/tree/master/packages/core/src/sensors
   */
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

  return (
    <MosaicContext.Provider value={{ containers, setContainer: handleSetContainer, activeItem, overItem }}>
      <DndContext
        collisionDetection={collisionDetection}
        modifiers={[modifiers]}
        sensors={sensors}
        // TODO(burdon): Allow container to veto drop.
        cancelDrop={(event) => false}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {children}
        {debug &&
          createPortal(
            <MosaicDebug containers={containers} activeItem={activeItem} overItem={overItem} />,
            document.body,
          )}
      </DndContext>
    </MosaicContext.Provider>
  );
};

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
