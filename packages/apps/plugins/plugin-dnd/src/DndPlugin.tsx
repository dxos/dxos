//
// Copyright 2023 DXOS.org
//

import {
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { deepSignal } from 'deepsignal/react';
import React, { createContext, DependencyList, useContext, useEffect, useState } from 'react';

import { PluginDefinition, Surface } from '@dxos/react-surface';

import { dropAnimations, OverlayDropAnimation } from './animation';
import { DND_PLUGIN } from './types';

export type DndPluginProvides = {
  dnd: DndPluginStoreValue;
};

const dragOverSubscriptions: ((event: DragOverEvent) => void)[] = [];

export type DndPluginStoreValue = {
  overlayDropAnimation: OverlayDropAnimation;
};

// TODO(wittjosiah): Move out of top-level.
const state = deepSignal<DndPluginStoreValue>({
  overlayDropAnimation: 'away',
});

//
// useDragStart
//

const dragStartSubscriptions: ((event: DragStartEvent) => void)[] = [];

const handleDragStart = (event: DragStartEvent) => {
  dragStartSubscriptions.forEach((subscription) => subscription.call(this, event));
};

export const useDragStart = (callback: (event: DragStartEvent) => void, dependencies: DependencyList) => {
  useEffect(() => {
    dragStartSubscriptions.push(callback);
    return () => {
      const index = dragStartSubscriptions.indexOf(callback);
      dragStartSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

//
// useDragOver
//

const handleDragOver = (event: DragOverEvent) => {
  dragOverSubscriptions.forEach((subscription) => subscription.call(this, event));
};

export const useDragOver = (callback: (event: DragOverEvent) => void, dependencies: DependencyList) => {
  useEffect(() => {
    dragOverSubscriptions.push(callback);
    return () => {
      const index = dragOverSubscriptions.indexOf(callback);
      dragOverSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

//
// useDragEnd
//

const dragEndSubscriptions: ((event: DragEndEvent) => void)[] = [];

const handleDragEnd = (event: DragEndEvent) => {
  state.overlayDropAnimation = 'away';
  dragEndSubscriptions.forEach((subscription) => subscription.call(this, event));
};

export const useDragEnd = (callback: (event: DragEndEvent) => void, dependencies: DependencyList) => {
  useEffect(() => {
    dragEndSubscriptions.push(callback);
    return () => {
      const index = dragEndSubscriptions.indexOf(callback);
      dragEndSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

//
// useDragCancel
//

const dragCancelSubscriptions: ((event: DragCancelEvent) => void)[] = [];

const handleDragCancel = (event: DragCancelEvent) => {
  dragCancelSubscriptions.forEach((subscription) => subscription.call(this, event));
};

export const useDragCancel = (callback: (event: DragCancelEvent) => void, dependencies: DependencyList) => {
  useEffect(() => {
    dragCancelSubscriptions.push(callback);
    return () => {
      const index = dragCancelSubscriptions.indexOf(callback);
      dragCancelSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

//
// useDnd
//

export const DndPluginContext = createContext<DndPluginStoreValue>({ overlayDropAnimation: 'away' });

export const useDnd = () => useContext(DndPluginContext);

const DndOverlay = () => {
  const dnd = useDnd();
  const [activeData, setActiveData] = useState<unknown | null>(null);
  useDragStart(({ active: { data } }) => setActiveData(data.current?.dragoverlay), []);
  return (
    <DragOverlay adjustScale={false} dropAnimation={dropAnimations[dnd.overlayDropAnimation]}>
      <Surface role='dragoverlay' data={activeData} limit={1} />
    </DragOverlay>
  );
};

export const DndPlugin = (): PluginDefinition<DndPluginProvides> => {
  return {
    meta: {
      id: DND_PLUGIN,
    },
    provides: {
      components: {
        default: DndOverlay,
      },
      context: ({ children }) => {
        const sensors = useSensors(
          useSensor(MouseSensor, {
            // Require the mouse to move by 10 pixels before activating.
            activationConstraint: {
              distance: 10,
            },
          }),
          useSensor(TouchSensor, {
            // Press delay of 200ms, with tolerance of 5px of movement.
            activationConstraint: {
              delay: 200,
              tolerance: 5,
            },
          }),
          useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
          }),
        );
        return (
          <DndPluginContext.Provider value={state}>
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              {children}
            </DndContext>
          </DndPluginContext.Provider>
        );
      },
      dnd: state,
    },
  };
};
