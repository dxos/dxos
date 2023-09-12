//
// Copyright 2023 DXOS.org
//

import {
  DndContext as DndKitContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDeepSignal } from 'deepsignal/react';
import React, { createContext, PropsWithChildren, useCallback, useContext } from 'react';

import { OverlayDropAnimation, Handler } from './types';

type DndContextValue = {
  overlayDropAnimation: OverlayDropAnimation;
  dragOverSubscriptions: Handler<DragOverEvent>[];
  dragStartSubscriptions: Handler<DragStartEvent>[];
  dragEndSubscriptions: Handler<DragEndEvent>[];
  dragCancelSubscriptions: Handler<DragCancelEvent>[];
};

const defaultContextValue: DndContextValue = {
  overlayDropAnimation: 'around',
  dragOverSubscriptions: [],
  dragStartSubscriptions: [],
  dragEndSubscriptions: [],
  dragCancelSubscriptions: [],
};

const DndContext = createContext<DndContextValue>(defaultContextValue);

const useDnd = () => useContext(DndContext);

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
      contextValue.dragStartSubscriptions.forEach((subscription) => subscription.call(this, event));
    },
    [contextValue.dragStartSubscriptions],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      contextValue.dragEndSubscriptions.forEach((subscription) => subscription.call(this, event));
    },
    [contextValue.dragEndSubscriptions],
  );

  const handleDragCancel = useCallback(
    (event: DragCancelEvent) => {
      contextValue.dragCancelSubscriptions.forEach((subscription) => subscription.call(this, event));
    },
    [contextValue.dragCancelSubscriptions],
  );

  return (
    <DndContext.Provider value={contextValue}>
      <DndKitContext
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        {children}
      </DndKitContext>
    </DndContext.Provider>
  );
};

export { DndProvider, DndContext, useDnd };
