//
// Copyright 2023 DXOS.org
//

import {
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCorners,
  CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDeepSignal } from 'deepsignal/react';
import React, { createContext, PropsWithChildren, useCallback, useContext } from 'react';

import { OverlayDropAnimation } from './types';
import { Handler } from '../types';

export type DndContextValue = {
  overlayDropAnimation: OverlayDropAnimation;
  activeId: string | null;
  activeMigrationClass: string | null;
  inhibitMigrationDestinationId: string | null;
  migrationDestinationId: string | null;
  activeCopyClass: Set<string> | null;
  copyDestinationId: string | null;
  dragOverSubscriptions: Handler<DragOverEvent>[];
  dragStartSubscriptions: Handler<DragStartEvent>[];
  dragEndSubscriptions: Handler<DragEndEvent>[];
  dragCancelSubscriptions: Handler<DragCancelEvent>[];
};

const defaultContextValue: DndContextValue = {
  overlayDropAnimation: 'around',
  activeId: null,
  activeMigrationClass: null,
  inhibitMigrationDestinationId: null,
  migrationDestinationId: null,
  activeCopyClass: null,
  copyDestinationId: null,
  dragOverSubscriptions: [],
  dragStartSubscriptions: [],
  dragEndSubscriptions: [],
  dragCancelSubscriptions: [],
};

const MosaicDndContext = createContext<DndContextValue>(defaultContextValue);

const useDnd = () => useContext(MosaicDndContext);

const dndCollisionComposition: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return closestCorners(args);
};

const DndProvider = ({ children }: PropsWithChildren<{}>) => {
  const contextValue = useDeepSignal<DndContextValue>(defaultContextValue);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 200ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      contextValue.dragOverSubscriptions.forEach((subscription) => subscription.call(this, event));
    },
    [contextValue.dragOverSubscriptions],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      contextValue.overlayDropAnimation = 'away';
      contextValue.activeId = event.active.id.toString();
      contextValue.dragStartSubscriptions.forEach((subscription) => subscription.call(this, event));
    },
    [contextValue.dragStartSubscriptions],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      contextValue.dragEndSubscriptions.forEach((subscription) => subscription.call(this, event));
      contextValue.activeId = null;
    },
    [contextValue.dragEndSubscriptions],
  );

  const handleDragCancel = useCallback(
    (event: DragCancelEvent) => {
      contextValue.activeId = null;
      contextValue.dragCancelSubscriptions.forEach((subscription) => subscription.call(this, event));
    },
    [contextValue.dragCancelSubscriptions],
  );

  return (
    <MosaicDndContext.Provider value={contextValue}>
      <DndContext
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        collisionDetection={dndCollisionComposition}
        sensors={sensors}
      >
        {children}
      </DndContext>
    </MosaicDndContext.Provider>
  );
};

export { DndProvider, MosaicDndContext, useDnd };
