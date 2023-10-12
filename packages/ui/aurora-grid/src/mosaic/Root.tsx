//
// Copyright 2023 DXOS.org
//

import {
  type CollisionDetection,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import pick from 'lodash.pick';
import React, { createContext, type FC, type PropsWithChildren, useState } from 'react';
import { createPortal } from 'react-dom';

import { type MosaicContainerProps } from './Container';
import { Debug } from './Debug';
import { DefaultComponent } from './DefaultComponent';
import { type MosaicTileComponent } from './Tile';
import { type MosaicDraggedItem } from './types';
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
      const container = containers.get(Path.first(activeItem.path));
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
    setActiveItem(pick(event.active.data.current as MosaicDraggedItem, 'path', 'item', 'position'));
  };

  const handleDragMove = (event: DragMoveEvent) => {};

  const handleDragOver = (event: DragOverEvent) => {
    const overItem = pick(event.over?.data.current as MosaicDraggedItem, 'path', 'item', 'position');

    // If the over item is the same as the active item, do nothing.
    // This happens when moving between containers where a placeholder of itself is rendered where it will be dropped.
    if (overItem?.item?.id === activeItem?.item.id) {
      return;
    }

    const activeContainer = activeItem && containers.get(Path.first(activeItem.path));
    const overContainer = overItem?.path && containers.get(Path.first(overItem.path));
    if (!event.over || !overItem || !overContainer || !activeItem || !activeContainer) {
      setOverItem(undefined);
      return;
    }

    const onOver = overContainer.onOver ?? (() => true);
    const item = onOver({ active: activeItem, over: overItem }) ? overItem : undefined;
    setOverItem(item);
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    setActiveItem(undefined);
    setOverItem(undefined);
  };

  // TODO(burdon): Add event type (e.g., copy vs. move).
  const handleDragEnd = (event: DragEndEvent) => {
    if (activeItem && overItem && (activeItem.path !== overItem.path || activeItem.position !== overItem.position)) {
      const activeContainer = containers.get(Path.first(activeItem.path));
      if (activeContainer) {
        activeContainer.onDrop?.({ active: activeItem, over: overItem });

        const overContainer = containers.get(Path.first(overItem?.path));
        if (overContainer && overContainer !== activeContainer) {
          overContainer.onDrop?.({ active: activeItem, over: overItem });
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
          path: activeItem?.path,
          position: activeItem?.position,
        },
        over: {
          id: overItem?.item?.id,
          path: overItem?.path,
          position: overItem?.position,
        },
      }}
    />
  );
};
