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

import { DEFAULT_TRANSITION, type MosaicContainerProps, type MosaicMoveEvent, type MosaicOperation } from './Container';
import { Debug } from './Debug';
import { DefaultComponent } from './DefaultComponent';
import { type MosaicTileComponent } from './Tile';
import { type MosaicDraggedItem } from './types';
import { Path } from './util';

const DEFAULT_COMPONENT_ID = '__default';

export type MosaicContextType = {
  containers: Record<string, MosaicContainerProps<any> | undefined>;
  setContainer: (id: string, container?: MosaicContainerProps<any>) => void;
  activeItem: MosaicDraggedItem | undefined;
  overItem: MosaicDraggedItem | undefined;
  operation: MosaicOperation;
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
  const [containers, setContainers] = useState<MosaicContextType['containers']>({
    [DEFAULT_COMPONENT_ID]: { id: DEFAULT_COMPONENT_ID, Component },
  });

  const handleSetContainer = (id: string, container?: MosaicContainerProps<any>) => {
    setContainers((containers) => {
      if (container) {
        return { ...containers, [id]: container };
      } else {
        const { [id]: _, ...rest } = containers;
        return rest;
      }
    });
  };

  const [activeItem, setActiveItem] = useState<MosaicDraggedItem>();
  const [overItem, setOverItem] = useState<MosaicDraggedItem>();
  const [operation, setOperation] = useState<MosaicOperation>('reject');

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
      const container = containers[Path.first(activeItem.path)];
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

    const activeContainer = activeItem && containers[Path.first(activeItem.path)];
    const overContainer = overItem?.path && containers[Path.first(overItem.path)];
    if (!event.over || !overItem || !overContainer || !activeItem || !activeContainer) {
      setOperation('reject');
      setOverItem(undefined);
      return;
    }

    const onOver = ({ active, over }: MosaicMoveEvent) => {
      if (Path.parent(active.path) === Path.parent(over.path)) {
        return 'rearrange';
      } else if (overContainer.onOver) {
        return overContainer.onOver({ active, over });
      } else {
        return 'reject';
      }
    };

    setOperation(onOver({ active: activeItem, over: overItem }));
    setOverItem(overItem);
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    setOperation('reject');
    setActiveItem(undefined);
    setOverItem(undefined);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overContainer = overItem && containers[Path.first(overItem.path)];

    if (
      operation !== 'reject' &&
      activeItem &&
      overItem &&
      (activeItem.path !== overItem.path || activeItem.position !== overItem.position)
    ) {
      const activeContainer = containers[Path.first(activeItem.path)];
      if (activeContainer) {
        activeContainer.onDrop?.({ operation, active: activeItem, over: overItem });

        if (overContainer && overContainer !== activeContainer) {
          overContainer.onDrop?.({ operation, active: activeItem, over: overItem });
        }
      }
    }

    setTimeout(() => {
      setOperation('reject');
      setOverItem(undefined);
      setActiveItem(undefined);
    }, overContainer?.transitionDuration ?? DEFAULT_TRANSITION);
  };

  return (
    <MosaicContext.Provider value={{ containers, setContainer: handleSetContainer, activeItem, overItem, operation }}>
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
            <MosaicDebug containers={containers} operation={operation} activeItem={activeItem} overItem={overItem} />,
            document.body,
          )}
      </DndContext>
    </MosaicContext.Provider>
  );
};

const MosaicDebug: FC<{
  containers: MosaicContextType['containers'];
  operation: MosaicOperation;
  activeItem?: MosaicDraggedItem;
  overItem?: MosaicDraggedItem;
}> = ({ containers, operation, activeItem, overItem }) => {
  return (
    <Debug
      position='bottom-right'
      data={{
        containers: Object.keys(containers).map((id) => id),
        operation,
        active: {
          id: activeItem?.item?.id.slice(0, 16),
          path: activeItem?.path && Path.create(...Path.parts(activeItem.path).map((part) => part.slice(0, 16))),
          position: activeItem?.position,
        },
        over: {
          id: overItem?.item?.id.slice(0, 16),
          path: overItem?.path && Path.create(...Path.parts(overItem.path).map((part) => part.slice(0, 16))),
          position: overItem?.position,
        },
      }}
    />
  );
};
