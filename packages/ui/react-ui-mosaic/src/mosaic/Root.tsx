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
  type DropAnimation,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import React, { createContext, type FC, type PropsWithChildren, useState } from 'react';
import { createPortal } from 'react-dom';

import { pick } from '@dxos/util';

import {
  DEFAULT_TRANSITION,
  type DefaultMoveDetails,
  type MosaicContainerProps,
  type MosaicOperation,
} from './Container';
import { Debug } from './Debug';
import { DefaultComponent } from './DefaultComponent';
import { type MosaicTileComponent } from './Tile';
import { type MosaicDraggedItem } from './types';
import { Path } from './util';

const DEFAULT_COMPONENT_ID = '__default';

export type MosaicDropAnimation = DropAnimation | null | undefined | void;

export type MosaicContextType = {
  containers: Record<string, MosaicContainerProps<any> | undefined>;
  setContainer: (id: string, container?: MosaicContainerProps<any>) => void;
  activeItem: MosaicDraggedItem | undefined;
  overItem: MosaicDraggedItem | undefined;
  operation: MosaicOperation;
  moveDetails?: Record<string, unknown>;
  dropAnimation?: MosaicDropAnimation;
};

export const MosaicContext = createContext<MosaicContextType | undefined>(undefined);

export type MosaicRootProps = PropsWithChildren<{
  /**
   * Default component.
   */
  Component?: MosaicTileComponent<any>;
  debug?: boolean;
}>;

const defaultDropAnimation: MosaicDropAnimation = { duration: 0 };

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
  const [moveDetails, setMoveDetails] = useState<(DefaultMoveDetails & Record<string, any>) | undefined>();
  const [dropAnimation, setDropAnimation] = useState<MosaicDropAnimation>(defaultDropAnimation);

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
    setActiveItem(pick(event.active.data.current as MosaicDraggedItem, ['path', 'type', 'item', 'position']));
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const nextOverItem = pick(event.over?.data.current as MosaicDraggedItem, ['path', 'type', 'item', 'position']);
    const nextOverContainer =
      nextOverItem && nextOverItem?.path ? containers[Path.first(nextOverItem.path)] : undefined;
    if (!event.over || !nextOverItem || !nextOverContainer) {
      setOperation('reject');
      setOverItem(undefined);
      return;
    }

    if (overItem !== nextOverItem) {
      setOverItem(nextOverItem);
    }

    if (activeItem && nextOverItem && nextOverContainer?.onMove) {
      const { operation: nextOperation, details: nextDetails } = nextOverContainer.onMove({
        active: activeItem,
        over: nextOverItem,
        details: { delta: event.delta },
      });
      setOperation(nextOperation);
      if (
        // always set falsy symbols
        !nextDetails ||
        // always set if details become truthy
        (!moveDetails && nextDetails) ||
        // only update if details change
        Object.entries(nextDetails).find(([key, value]) => !(key in moveDetails!) || moveDetails![key] !== value)
      ) {
        setMoveDetails(nextDetails);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overItem = pick(event.over?.data.current as MosaicDraggedItem, ['path', 'type', 'item', 'position']);
    const overContainer = overItem && overItem?.path ? containers[Path.first(overItem.path)] : undefined;
    // TODO(wittjosiah): This is over-prescriptive.
    if (overContainer?.onMove) {
      // The over container will have handled this in its move handler.
      return;
    }

    const activeContainer = activeItem && containers[Path.first(activeItem.path)];
    if (!event.over || !overItem || !overContainer || !activeItem || !activeContainer) {
      setOperation('reject');
      setOverItem(undefined);
      return;
    }

    let operation: MosaicOperation = 'reject' as const;
    if (overContainer.onOver) {
      operation = overContainer.onOver({
        active: activeItem,
        over: overItem,
        details: moveDetails,
      });
    }

    setOperation(operation);
    setOverItem(overItem);
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    setOperation('reject');
    setActiveItem(undefined);
    setOverItem(undefined);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overContainer = overItem && containers[Path.first(overItem.path)];

    if (operation !== 'reject' && activeItem && overItem) {
      let nextDropAnimation: MosaicDropAnimation = defaultDropAnimation;
      const activeContainer = containers[Path.first(activeItem.path)];
      if (activeContainer) {
        nextDropAnimation = activeContainer.onDrop?.({
          operation,
          active: activeItem,
          over: overItem,
          details: moveDetails,
        });

        if (overContainer && overContainer !== activeContainer) {
          nextDropAnimation = overContainer.onDrop?.({
            operation,
            active: activeItem,
            over: overItem,
            details: moveDetails,
          });
        }
      }
      setDropAnimation(nextDropAnimation);
    }

    Object.values(containers).forEach((container) => container?.onDragEnd?.(event));

    setTimeout(() => {
      setOperation('reject');
      setOverItem(undefined);
      setActiveItem(undefined);
    }, overContainer?.transitionDuration ?? DEFAULT_TRANSITION);
  };

  return (
    <MosaicContext.Provider
      value={{
        containers,
        setContainer: handleSetContainer,
        activeItem,
        overItem,
        operation,
        moveDetails,
        dropAnimation,
      }}
    >
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
          type: activeItem?.type,
          position: activeItem?.position,
        },
        over: {
          id: overItem?.item?.id.slice(0, 16),
          path: overItem?.path && Path.create(...Path.parts(overItem.path).map((part) => part.slice(0, 16))),
          type: overItem?.type,
          position: overItem?.position,
        },
      }}
    />
  );
};
