//
// Copyright 2023 DXOS.org
//

import {
  defaultDropAnimationSideEffects,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  UniqueIdentifier,
} from '@dnd-kit/core';
import React, { createContext, DependencyList, useContext, useEffect, useState } from 'react';

import { createStore } from '@dxos/observable-object';
import { observer } from '@dxos/observable-object/react';
import { PluginDefinition, Surface } from '@dxos/react-surface';

export type DndPluginProvides = {
  dnd: DndPluginStoreValue;
};

const dragOverSubscriptions: ((event: DragOverEvent) => void)[] = [];

type OverlayDropAnimation = 'around' | 'away' | 'into';

export type DndPluginStoreValue = {
  active: DragOverEvent['active'] | null;
  over: DragOverEvent['over'] | null;
  overlayDropAnimation: OverlayDropAnimation;
};

const store = createStore<DndPluginStoreValue>({
  active: null,
  over: null,
  overlayDropAnimation: 'around',
});

const handleDragOver = (event: DragOverEvent) => {
  store.over = event.over ?? null;
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

const dragStartSubscriptions: ((event: DragStartEvent) => void)[] = [];

const handleDragStart = (event: DragStartEvent) => {
  store.active = event.active;
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

const dragEndSubscriptions: ((event: DragEndEvent) => void)[] = [];

const handleDragEnd = (event: DragEndEvent) => {
  store.active = null;
  store.over = null;
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

const dragCancelSubscriptions: ((event: DragCancelEvent) => void)[] = [];

const handleDragCancel = (event: DragCancelEvent) => {
  store.active = null;
  store.over = null;
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

const dropAnimations: Record<OverlayDropAnimation, DropAnimation> = {
  around: {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0',
        },
      },
    }),
  },
  away: {
    duration: 180,
    easing: 'ease-in',
    keyframes: ({ transform: { initial } }) => [
      {
        opacity: 1,
        transform: `translate(${initial.x}px, ${initial.y}px) scale(1, 1)`,
      },
      {
        opacity: 0,
        transform: `translate(${initial.x}px, ${initial.y}px) scale(1.33, 1.33)`,
        transformOrigin: '',
      },
    ],
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '1',
        },
      },
    }),
  },
  into: {
    duration: 180,
    easing: 'ease-in',
    keyframes: ({ transform: { initial } }) => [
      {
        opacity: 1,
        transform: `translate(${initial.x}px, ${initial.y}px) scale(1, 1)`,
      },
      {
        opacity: 0,
        transform: `translate(${initial.x}px, ${initial.y}px) scale(0.66, 0.66)`,
        transformOrigin: '',
      },
    ],
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '1',
        },
      },
    }),
  },
};

export const DndPluginContext = createContext<DndPluginStoreValue>(store);

export const useDnd = () => useContext(DndPluginContext);

const DndOverlay = observer(() => {
  const dnd = useDnd();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  useDragStart(({ active: { id } }) => setActiveId(id), []);
  return (
    <DragOverlay adjustScale={false} dropAnimation={dropAnimations[dnd.overlayDropAnimation]}>
      <Surface role='dragoverlay' data={activeId} limit={1} />
    </DragOverlay>
  );
});

export const DndPlugin = (): PluginDefinition<DndPluginProvides> => ({
  meta: {
    id: 'dxos:dnd',
  },
  provides: {
    components: {
      default: DndOverlay,
    },
    context: ({ children }) => (
      <DndPluginContext.Provider value={store}>
        <DndContext
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          {children}
        </DndContext>
      </DndPluginContext.Provider>
    ),
    dnd: store,
  },
});
