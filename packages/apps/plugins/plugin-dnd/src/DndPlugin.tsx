//
// Copyright 2023 DXOS.org
//

import { DndContext, DragCancelEvent, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import React from 'react';

import { PluginDefinition } from '@dxos/react-surface';

export type DndPluginProvides = {};

const handleDragOver = (event: DragOverEvent) => {
  console.log('[drag over]', event);
};
const handleDragStart = (event: DragStartEvent) => {
  console.log('[drag start]', event);
};
const handleDragEnd = (event: DragEndEvent) => {
  console.log('[drag end]', event);
};
const handleDragCancel = (event: DragCancelEvent) => {
  console.log('[drag cancel]', event);
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
