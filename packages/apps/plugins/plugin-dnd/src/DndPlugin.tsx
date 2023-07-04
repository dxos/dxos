//
// Copyright 2023 DXOS.org
//

import { DndContext, DragCancelEvent, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import React, { DependencyList, useEffect } from 'react';

import { PluginDefinition } from '@dxos/react-surface';

export type DndPluginProvides = {};

const dragOverSubscriptions: ((event: DragOverEvent) => void)[] = [];

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

const dragEndSubscriptions: ((event: DragEndEvent) => void)[] = [];

const handleDragEnd = (event: DragEndEvent) => {
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

export const DndPlugin = (): PluginDefinition<DndPluginProvides> => ({
  meta: {
    id: 'dxos:dnd',
  },
  provides: {
    context: ({ children }) => (
      <DndContext
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DndContext>
    ),
  },
});
